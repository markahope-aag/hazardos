import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { createAdminClient } from '@/lib/supabase/admin'

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
  { rateLimit: 'general' },
  async (request, context, params) => {
    const orgId = context.profile.organization_id

    const { data: report, error: loadErr } = await context.supabase
      .from('lab_reports')
      .select('id, storage_path')
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

    const safeName = file.name.replace(/[^\w.\- ]+/g, '_')
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
        file_name: file.name,
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
