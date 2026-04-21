import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'
import { generateManifestPDFBase64 } from '@/lib/services/manifest-pdf-generator'
import type { Manifest, ManifestVehicle } from '@/types/manifests'

const emailManifestSchema = z.object({
  to: z.array(z.string().email()).min(1, 'At least one recipient is required').max(10),
  subject: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
})

/**
 * POST /api/manifests/[id]/email
 * Generate the manifest PDF server-side and email it as an attachment
 * via Resend. Both draft and issued manifests can be emailed — the
 * PDF header labels the state so recipients know which they're holding.
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_MANAGE,
    bodySchema: emailManifestSchema,
  },
  async (_request, context, params, body) => {
    const { data: manifest, error: manifestError } = await context.supabase
      .from('manifests')
      .select('*, vehicles:manifest_vehicles(*)')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (manifestError || !manifest) {
      throw new SecureError('NOT_FOUND', 'Manifest not found')
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      throw new SecureError(
        'BAD_REQUEST',
        'Email provider not configured. Set RESEND_API_KEY.',
      )
    }

    const pdfBase64 = generateManifestPDFBase64(
      manifest as Manifest,
      (manifest.vehicles || []) as ManifestVehicle[],
    )

    const { data: org } = await context.supabase
      .from('organizations')
      .select('name, email')
      .eq('id', context.profile.organization_id)
      .single()

    const orgName = org?.name || 'HazardOS'
    const subject = body.subject || `Manifest ${manifest.manifest_number} — ${orgName}`
    const filename = `${manifest.manifest_number}.pdf`

    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendApiKey)

      await resend.emails.send({
        from: `${orgName} <notifications@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
        to: body.to,
        subject,
        html: `
          <p>${body.message ? body.message : `Manifest ${manifest.manifest_number} attached.`}</p>
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
        { manifestId: manifest.id, recipients: body.to.length },
        'Manifest emailed',
      )
    } catch (err) {
      context.log.error({ error: err }, 'Failed to email manifest')
      throw new SecureError('BAD_REQUEST', 'Could not send email.')
    }

    // Stamp last-emailed on the manifest so the audit trail shows it
    // went out. Using updated_at is enough for now — add a dedicated
    // column if we need more granular tracking later.
    await context.supabase
      .from('manifests')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', manifest.id)
      .then((res) => {
        if (res.error) throwDbError(res.error, 'stamp manifest email')
      })

    return NextResponse.json({ sent: true, recipients: body.to.length })
  },
)
