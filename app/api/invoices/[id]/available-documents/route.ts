import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/invoices/[id]/available-documents
 * Lists files the user can attach to this invoice. Two sources:
 *
 *   - `documents`: job_documents on the linked job (lab reports the
 *     team uploaded directly to the job, plus permits, photos, etc.).
 *   - `lab_reports`: full lab_reports records that are either already
 *     attached to this invoice, orphan (no invoice yet), or linked to
 *     the same customer — covers the common workflows without flooding
 *     the picker with every lab report in the org.
 *
 * Both sources are returned in one response so the picker can render
 * them side-by-side.
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, context, params) => {
    const orgId = context.profile.organization_id

    const { data: invoice, error: invErr } = await context.supabase
      .from('invoices')
      .select('id, job_id, customer_id')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (invErr) throwDbError(invErr, 'load invoice')
    if (!invoice) throw new SecureError('NOT_FOUND', 'Invoice not found')

    let documents: unknown[] = []
    if (invoice.job_id) {
      const { data, error } = await context.supabase
        .from('job_documents')
        .select('id, file_name, category, mime_type, size_bytes, uploaded_at, notes')
        .eq('job_id', invoice.job_id)
        .order('uploaded_at', { ascending: false })
      if (error) throwDbError(error, 'list available documents')
      documents = data || []
    }

    // Candidates: received reports with a file, scoped so the picker
    // shows only relevant rows. RLS already constrains by org.
    let labQuery = context.supabase
      .from('lab_reports')
      .select(
        'id, report_number, file_name, sample_type, sample_description, ordered_date, received_date, invoice_id, customer_id',
      )
      .eq('organization_id', orgId)
      .eq('status', 'received')
      .not('storage_path', 'is', null)
      .order('received_date', { ascending: false })

    const filters = [`invoice_id.eq.${params.id}`, 'invoice_id.is.null']
    if (invoice.customer_id) filters.push(`customer_id.eq.${invoice.customer_id}`)
    labQuery = labQuery.or(filters.join(','))

    const { data: labReports, error: labErr } = await labQuery
    if (labErr) throwDbError(labErr, 'list available lab reports')

    return NextResponse.json({
      documents,
      lab_reports: labReports || [],
      has_linked_job: !!invoice.job_id,
    })
  },
)
