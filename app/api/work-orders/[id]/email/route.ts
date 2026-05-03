import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'
import {
  generateWorkOrderPDFBase64,
  type WorkOrderMediaItem,
} from '@/lib/services/work-order-pdf-generator'
import type { WorkOrder, WorkOrderSnapshot, WorkOrderVehicle } from '@/types/work-orders'
import type { SurveyPhotoMetadata } from '@/types/database'

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 // 24h — recipient may open later
const MAX_PDF_PHOTO_EMBEDS = 6

function isVideoItem(m: SurveyPhotoMetadata): boolean {
  if (m.mediaType === 'video') return true
  if (m.mimeType?.startsWith('video/')) return true
  return /\.(mp4|mov|webm|m4v|ogv)(\?|$)/i.test(m.url || m.path || '')
}

const emailWorkOrderSchema = z.object({
  to: z.array(z.string().email()).min(1, 'At least one recipient is required').max(10),
  subject: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
})

/**
 * POST /api/work-orders/[id]/email
 * Generate the work order PDF server-side and email it as an attachment
 * via Resend. Both draft and issued work orders can be emailed — the
 * PDF header labels the state so recipients know which they're holding.
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_MANAGE,
    bodySchema: emailWorkOrderSchema,
  },
  async (_request, context, params, body) => {
    const { data: workOrder, error: workOrderError } = await context.supabase
      .from('work_orders')
      .select('*, vehicles:work_order_vehicles(*)')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (workOrderError || !workOrder) {
      throw new SecureError('NOT_FOUND', 'Work order not found')
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      throw new SecureError(
        'BAD_REQUEST',
        'Email provider not configured. Set RESEND_API_KEY.',
      )
    }

    // Pull the source survey's media so the field team gets photos and
    // videos in the PDF, the same way the in-app gallery does.
    const surveyId = (workOrder.snapshot as WorkOrderSnapshot | null)?.job?.site_survey_id
    let media: WorkOrderMediaItem[] = []
    if (surveyId) {
      const { data: survey } = await context.supabase
        .from('site_surveys')
        .select('photo_metadata')
        .eq('id', surveyId)
        .eq('organization_id', context.profile.organization_id)
        .single()
      const raw: SurveyPhotoMetadata[] =
        (survey?.photo_metadata as SurveyPhotoMetadata[] | null) ?? []

      const images = raw.filter((m) => !isVideoItem(m))
      const videos = raw.filter(isVideoItem)
      const toEmbed = images.slice(0, MAX_PDF_PHOTO_EMBEDS)
      const toLink = images.slice(MAX_PDF_PHOTO_EMBEDS)

      // Sign every path that has one.
      const allPaths = raw.map((m) => m.path).filter((p): p is string => !!p)
      const signedByPath: Record<string, string> = {}
      if (allPaths.length > 0) {
        const { data: signed } = await context.supabase.storage
          .from('survey-photos')
          .createSignedUrls(allPaths, SIGNED_URL_TTL_SECONDS)
        for (const item of signed || []) {
          if (item.path && item.signedUrl) signedByPath[item.path] = item.signedUrl
        }
      }

      const resolveUrl = (m: SurveyPhotoMetadata): string =>
        (m.path && signedByPath[m.path]) ||
        (m.url?.startsWith('data:') ? m.url : m.url) ||
        ''

      // Fetch image bytes server-side and convert to base64 data URLs so
      // jsPDF can embed them. Failures fall through to a text link.
      const embedded: WorkOrderMediaItem[] = await Promise.all(
        toEmbed.map(async (m) => {
          const url = resolveUrl(m)
          let dataUrl: string | null = null
          if (url) {
            try {
              const res = await fetch(url)
              if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer())
                const mime = res.headers.get('content-type') || m.mimeType || 'image/jpeg'
                dataUrl = `data:${mime};base64,${buf.toString('base64')}`
              }
            } catch (err) {
              context.log.warn(
                { err, path: m.path },
                'Failed to inline survey photo for PDF',
              )
            }
          }
          return {
            kind: 'image' as const,
            label: m.caption || 'Photo',
            caption: m.caption || null,
            url,
            dataUrl,
          }
        }),
      )

      media = [
        ...embedded,
        ...toLink.map((m) => ({
          kind: 'image' as const,
          label: m.caption || 'Photo',
          caption: m.caption || null,
          url: resolveUrl(m),
        })),
        ...videos.map((m) => ({
          kind: 'video' as const,
          label: m.caption || 'Video',
          caption: m.caption || null,
          url: resolveUrl(m),
        })),
      ].filter((item) => item.url)
    }

    const pdfBase64 = generateWorkOrderPDFBase64(
      workOrder as WorkOrder,
      (workOrder.vehicles || []) as WorkOrderVehicle[],
      media,
    )

    const { data: org } = await context.supabase
      .from('organizations')
      .select('name, email')
      .eq('id', context.profile.organization_id)
      .single()

    const orgName = org?.name || 'HazardOS'
    const subject = body.subject || `Work Order ${workOrder.work_order_number} — ${orgName}`
    const filename = `${workOrder.work_order_number}.pdf`

    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendApiKey)

      await resend.emails.send({
        from: `${orgName} <notifications@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
        to: body.to,
        subject,
        html: `
          <p>${body.message ? body.message : `Work Order ${workOrder.work_order_number} attached.`}</p>
          <p style="font-size: 12px; color: #6b7280;">
            Sent from ${orgName}.
          </p>
        `,
        attachments: [
          {
            filename,
            content: pdfBase64,
          },
        ],
      })

      context.log.info(
        { workOrderId: workOrder.id, recipients: body.to.length },
        'Work order emailed',
      )
    } catch (err) {
      context.log.error({ error: err }, 'Failed to email work order')
      throw new SecureError('BAD_REQUEST', 'Could not send email.')
    }

    // Stamp last-emailed on the work order so the audit trail shows it
    // went out. Using updated_at is enough for now — add a dedicated
    // column if we need more granular tracking later.
    await context.supabase
      .from('work_orders')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', workOrder.id)
      .then((res) => {
        if (res.error) throwDbError(res.error, 'stamp work order email')
      })

    return NextResponse.json({ sent: true, recipients: body.to.length })
  },
)
