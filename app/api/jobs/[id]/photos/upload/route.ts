import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { JobCompletionPhotosService } from '@/lib/services/job-completion-photos-service'
import { JobCompletionService } from '@/lib/services/job-completion-service'

const MAX_BYTES = 15 * 1024 * 1024 // 15 MB — photos are compressed client-side
const PHOTO_TYPES = ['before', 'during', 'after', 'issue', 'documentation'] as const

/**
 * POST /api/jobs/[id]/photos/upload
 * multipart/form-data: file, photo_type
 *
 * The completion Photos tab posts a compressed image here. The service layer
 * (uploadPhoto + createPhoto) already existed, but this route did not — so the
 * upload 404'd and the UI surfaced "Photo upload not configured" (J19). This
 * wires the multipart file through storage (job-completion-photos bucket) and
 * records a job_completion_photos row.
 */
export const POST = createApiHandlerWithParams(
  { rateLimit: 'upload' },
  async (request, context, params) => {
    const orgId = context.profile.organization_id

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      throw new SecureError('VALIDATION_ERROR', 'Missing file', 'file')
    }
    if (file.size === 0) {
      throw new SecureError('VALIDATION_ERROR', 'File is empty', 'file')
    }
    if (file.size > MAX_BYTES) {
      throw new SecureError('VALIDATION_ERROR', 'File exceeds 15MB limit', 'file')
    }

    const rawType = formData.get('photo_type')
    const photoType = PHOTO_TYPES.includes(rawType as (typeof PHOTO_TYPES)[number])
      ? (rawType as (typeof PHOTO_TYPES)[number])
      : undefined

    // Upload to the job-completion-photos bucket, then record the row. If the
    // DB insert fails, remove the just-uploaded object so storage and the table
    // stay in sync.
    const { url, path } = await JobCompletionPhotosService.uploadPhoto(params.id, orgId, file)
    try {
      const photo = await JobCompletionService.createPhoto({
        job_id: params.id,
        photo_url: url,
        storage_path: path,
        photo_type: photoType,
      })
      return NextResponse.json(photo, { status: 201 })
    } catch (err) {
      // Roll back the storage object so a failed insert doesn't orphan a file.
      await context.supabase.storage.from('job-completion-photos').remove([path]).then(
        () => {}, () => {},
      )
      throw err
    }
  },
)
