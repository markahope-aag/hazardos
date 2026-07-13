import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'

const putSchema = z.object({
  job_document_ids: z.array(z.string().uuid()),
})

/**
 * GET /api/invoices/[id]/attachments
 * List everything currently attached to this invoice — explicit
 * job_document picks plus any lab reports linked to this invoice.
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, context, params) => {
    const orgId = context.profile.organization_id

    const { data: invoice, error: invErr } = await context.supabase
      .from('invoices')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (invErr) throwDbError(invErr, 'load invoice')
    if (!invoice) throw new SecureError('NOT_FOUND', 'Invoice not found')

    // Hint by constraint name: 20260505000090 upgraded job_document_id to a
    // composite (job_document_id, organization_id) FK, and PostgREST's
    // `!job_document_id` column-name hint only matches single-column FKs.
    const { data, error } = await context.supabase
      .from('invoice_attached_documents')
      .select(`
        job_document_id,
        attached_at,
        document:job_documents!invoice_attached_documents_job_document_id_org_fkey(
          id, file_name, category, mime_type, size_bytes, uploaded_at, notes
        )
      `)
      .eq('invoice_id', params.id)
      .order('attached_at', { ascending: false })

    if (error) throwDbError(error, 'list invoice attachments')

    // Lab reports keep their own invoice_id pointer rather than going
    // through the invoice_attached_documents join, so query separately.
    const { data: labReports, error: labErr } = await context.supabase
      .from('lab_reports')
      .select('id, report_number, file_name, sample_type, received_date, mime_type, size_bytes')
      .eq('invoice_id', params.id)
      .eq('organization_id', orgId)
      .not('storage_path', 'is', null)
      .order('received_date', { ascending: false })

    if (labErr) throwDbError(labErr, 'list invoice lab reports')

    return NextResponse.json({
      attachments: data || [],
      lab_reports: labReports || [],
    })
  },
)

/**
 * PUT /api/invoices/[id]/attachments
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

    const { data: invoice, error: invErr } = await context.supabase
      .from('invoices')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (invErr) throwDbError(invErr, 'load invoice')
    if (!invoice) throw new SecureError('NOT_FOUND', 'Invoice not found')

    if (body.job_document_ids.length > 0) {
      const { data: docs, error: docErr } = await context.supabase
        .from('job_documents')
        .select('id')
        .eq('organization_id', orgId)
        .in('id', body.job_document_ids)
      if (docErr) throwDbError(docErr, 'verify documents')
      if (!docs || docs.length !== body.job_document_ids.length) {
        throw new SecureError('NOT_FOUND', 'One or more documents not found')
      }
    }

    const { error: delErr } = await context.supabase
      .from('invoice_attached_documents')
      .delete()
      .eq('invoice_id', params.id)
    if (delErr) throwDbError(delErr, 'clear invoice attachments')

    if (body.job_document_ids.length > 0) {
      const rows = body.job_document_ids.map((job_document_id) => ({
        invoice_id: params.id,
        job_document_id,
        organization_id: orgId,
        attached_by: context.user.id,
      }))
      const { error: insErr } = await context.supabase
        .from('invoice_attached_documents')
        .insert(rows)
      if (insErr) throwDbError(insErr, 'attach documents')
    }

    return NextResponse.json({ success: true, count: body.job_document_ids.length })
  },
)
