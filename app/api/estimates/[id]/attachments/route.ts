import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'

const putSchema = z.object({
  document_ids: z.array(z.string().uuid()),
})

/**
 * GET /api/estimates/[id]/attachments
 * List the credential documents currently attached to this estimate.
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, context, params) => {
    const orgId = context.profile.organization_id

    const { data: estimate, error: estErr } = await context.supabase
      .from('estimates')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (estErr) throwDbError(estErr, 'load estimate')
    if (!estimate) throw new SecureError('NOT_FOUND', 'Estimate not found')

    // Hint by constraint name: 20260505000090 upgraded document_id to a
    // composite (document_id, organization_id) FK, and PostgREST's
    // `!document_id` column-name hint only matches single-column FKs.
    const { data, error } = await context.supabase
      .from('estimate_attached_documents')
      .select(`
        document_id,
        attached_at,
        document:organization_documents!estimate_attached_documents_document_id_org_fkey(
          id, display_name, file_name, category, expires_on, document_number
        )
      `)
      .eq('estimate_id', params.id)
      .order('attached_at', { ascending: false })

    if (error) throwDbError(error, 'list estimate attachments')
    return NextResponse.json({ attachments: data || [] })
  },
)

/**
 * PUT /api/estimates/[id]/attachments
 * Replace the full set of attached documents in one shot — keeps the
 * picker UI simple (it just sends the current selection).
 */
export const PUT = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: putSchema,
  },
  async (_request, context, params, body) => {
    const orgId = context.profile.organization_id

    const { data: estimate, error: estErr } = await context.supabase
      .from('estimates')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (estErr) throwDbError(estErr, 'load estimate')
    if (!estimate) throw new SecureError('NOT_FOUND', 'Estimate not found')

    // Verify every doc id belongs to the caller's org before touching
    // the join table — RLS would block cross-org writes anyway, but a
    // pre-check returns a clean 404 instead of a partial success.
    if (body.document_ids.length > 0) {
      const { data: docs, error: docErr } = await context.supabase
        .from('organization_documents')
        .select('id')
        .eq('organization_id', orgId)
        .in('id', body.document_ids)
      if (docErr) throwDbError(docErr, 'verify documents')
      if (!docs || docs.length !== body.document_ids.length) {
        throw new SecureError('NOT_FOUND', 'One or more documents not found')
      }
    }

    // Replace strategy: wipe and reinsert. Volume is tiny (an estimate
    // attaches a handful of credentials), so the simpler write beats
    // a diff.
    const { error: delErr } = await context.supabase
      .from('estimate_attached_documents')
      .delete()
      .eq('estimate_id', params.id)
    if (delErr) throwDbError(delErr, 'clear estimate attachments')

    if (body.document_ids.length > 0) {
      const rows = body.document_ids.map((document_id) => ({
        estimate_id: params.id,
        document_id,
        organization_id: orgId,
        attached_by: context.user.id,
      }))
      const { error: insErr } = await context.supabase
        .from('estimate_attached_documents')
        .insert(rows)
      if (insErr) throwDbError(insErr, 'attach documents')
    }

    return NextResponse.json({ success: true, count: body.document_ids.length })
  },
)
