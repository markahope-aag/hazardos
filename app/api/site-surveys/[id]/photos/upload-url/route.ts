import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError } from '@/lib/utils/secure-error-handler'
import {
  uploadUrlPayloadSchema,
  buildOriginalKey,
  extensionForMime,
} from '@/lib/validations/photo-upload'
import { presignUpload } from '@/lib/storage/r2'

/**
 * POST /api/site-surveys/[id]/photos/upload-url
 *
 * Issues a short-lived presigned R2 PUT URL the client can use to
 * upload an original photo or video directly to Cloudflare R2,
 * bypassing our serverless function for the bytes themselves. Saves a
 * round trip on cellular and avoids the 4.5 MB Vercel request body
 * cap entirely for video uploads.
 *
 * The URL is bound to:
 *   • the exact R2 key (computed from {org}/originals|videos/...)
 *   • the content type the client declared
 *   • a content-length cap derived from the requested size
 *
 * Tampering with any of those during upload causes R2 to reject the
 * PUT, so a malicious client can't repoint the URL at a different key
 * or oversize the upload.
 *
 * After a successful PUT, the client calls /finalize with the same
 * photoId + key to trigger the stamp pipeline (for images) and
 * insert the survey_photos row.
 */
export const POST = createApiHandlerWithParams(
  {
    allowedRoles: ROLES.TENANT_FIELD,
    bodySchema: uploadUrlPayloadSchema,
    rateLimit: 'upload',
  },
  async (_request, context, params, body) => {
    // 1. Survey ownership.
    const { data: survey } = await context.supabase
      .from('site_surveys')
      .select('id, organization_id')
      .eq('id', params.id)
      .single()

    if (!survey || survey.organization_id !== context.profile.organization_id) {
      throw new SecureError('NOT_FOUND', 'Survey not found')
    }

    // 2. Reject duplicate keys early. Clients should generate a fresh
    //    photoId per capture; if they reuse one we'd silently overwrite
    //    an existing original, which is bad for the forensic trail.
    const { count } = await context.supabase
      .from('survey_photos')
      .select('id', { count: 'exact', head: true })
      .eq('site_survey_id', params.id)
      .eq('legacy_id', body.photoId)

    if ((count ?? 0) > 0) {
      throw new SecureError(
        'BAD_REQUEST',
        'A photo with that id already exists for this survey — generate a new id and retry.',
      )
    }

    // 3. Build the R2 key.
    const extension = extensionForMime(
      body.contentType,
      body.mediaType === 'video' ? 'mp4' : 'jpg',
    )
    const key = buildOriginalKey({
      organizationId: context.profile.organization_id,
      surveyId: params.id,
      category: body.category,
      photoId: body.photoId,
      mediaType: body.mediaType,
      extension,
    })

    // 4. Presign. 10-minute TTL: long enough for a slow cellular
    //    upload of a 250 MB video, short enough that a leaked URL
    //    isn't a long-term liability.
    const uploadUrl = await presignUpload({
      key,
      contentType: body.contentType,
      contentLengthMax: body.contentLength,
      expiresIn: 600,
    })

    return NextResponse.json({ uploadUrl, key })
  },
)
