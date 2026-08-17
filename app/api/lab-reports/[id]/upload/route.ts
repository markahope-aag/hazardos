import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { buildLabReportFilename, summariseResult } from '@/lib/utils/lab-report-filename'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/auth/roles'

const BUCKET = 'lab-reports'
const MAX_BYTES = 25 * 1024 * 1024 // 25 MB — lab PDFs are usually small

/**
 * POST /api/lab-reports/[id]/upload
 * multipart/form-data: file
 *
 * Stores the returned lab report in the lab-reports bucket and flips
 * status from 'ordered' to 'received'. If a file was already attached
 * the previous one is deleted from storage so we don't accumulate
 * orphans.
 */
export const POST = createApiHandlerWithParams(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_FIELD },
  async (request, context, params) => {
    const orgId = context.profile.organization_id

    const { data: report, error: loadErr } = await context.supabase
      .from('lab_reports')
      .select(
        `id, storage_path, report_number, ordered_date, received_date,
         site_address, site_city,
         customer:customers!customer_id(name, company_name, first_name, last_name),
         samples:lab_report_samples(result)`,
      )
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (loadErr) throwDbError(loadErr, 'load lab report')
    if (!report) throw new SecureError('NOT_FOUND', 'Lab report not found')

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      throw new SecureError('VALIDATION_ERROR', 'Missing file', 'file')
    }
    if (file.size === 0) {
      throw new SecureError('VALIDATION_ERROR', 'File is empty', 'file')
    }
    if (file.size > MAX_BYTES) {
      throw new SecureError('VALIDATION_ERROR', 'File exceeds 25MB limit', 'file')
    }

    // Rename on the way in. "If I then send the file to somebody else, they
    // would not just have lab 2026 42 16" — the office forwards these, so the
    // filename has to say who, what, where and when on its own.
    const reportRow = report as unknown as {
      report_number: string | null
      ordered_date: string | null
      received_date: string | null
      site_address: string | null
      site_city: string | null
      customer: {
        name: string | null
        company_name: string | null
        first_name: string | null
        last_name: string | null
      } | null
      samples: Array<{ result: string | null }> | null
    }
    const cust = Array.isArray(reportRow.customer) ? reportRow.customer[0] : reportRow.customer
    const subject =
      cust?.company_name ||
      [cust?.first_name, cust?.last_name].filter(Boolean).join(' ') ||
      cust?.name ||
      null

    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'pdf'
    const displayName = buildLabReportFilename({
      subject,
      result: summariseResult(reportRow.samples),
      siteAddress: reportRow.site_address,
      siteCity: reportRow.site_city,
      // The report date is when it came back; falls back to when it went out.
      date: reportRow.received_date || reportRow.ordered_date,
      reportNumber: reportRow.report_number,
      extension,
    })

    const safeName = displayName.replace(/[^\w.\- ()]+/g, '_')
    const uniqueId = crypto.randomUUID()
    const storagePath = `${orgId}/${params.id}/${uniqueId}-${safeName}`

    const admin = createAdminClient()
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })
    if (uploadErr) {
      throw new SecureError('BAD_REQUEST', `Upload failed: ${uploadErr.message}`)
    }

    // Replace the old file (if any) — only after the new upload succeeds
    // so a failed upload doesn't lose the previously-attached report.
    if (report.storage_path && report.storage_path !== storagePath) {
      await admin.storage.from(BUCKET).remove([report.storage_path])
    }

    const today = new Date().toISOString().slice(0, 10)
    const { data: updated, error: updateErr } = await context.supabase
      .from('lab_reports')
      .update({
        file_name: displayName,
        storage_path: storagePath,
        mime_type: file.type || null,
        size_bytes: file.size,
        status: 'received',
        received_date: today,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateErr) {
      // Rollback the storage object so the row and the file stay in sync.
      await admin.storage.from(BUCKET).remove([storagePath])
      throwDbError(updateErr, 'attach lab report file')
    }

    return NextResponse.json(updated)
  },
)
