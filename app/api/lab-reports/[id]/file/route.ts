import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/lab-reports/[id]/file
 * Returns a short-lived signed URL for the attached lab-report file so
 * the UI can open or download it without exposing storage paths.
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, context, params) => {
    const orgId = context.profile.organization_id

    const { data: report, error } = await context.supabase
      .from('lab_reports')
      .select('storage_path, file_name')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (error) throwDbError(error, 'load lab report')
    if (!report) throw new SecureError('NOT_FOUND', 'Lab report not found')
    if (!report.storage_path) {
      throw new SecureError('NOT_FOUND', 'No file attached to this lab report')
    }

    const admin = createAdminClient()
    const { data, error: signErr } = await admin.storage
      .from('lab-reports')
      .createSignedUrl(report.storage_path, 3600)
    if (signErr || !data?.signedUrl) {
      throw new SecureError('NOT_FOUND', signErr?.message || 'Could not sign URL')
    }

    return NextResponse.json({ url: data.signedUrl, file_name: report.file_name })
  },
)
