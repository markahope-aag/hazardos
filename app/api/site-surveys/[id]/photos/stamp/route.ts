import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/auth/roles'
import { photoStampPayloadSchema } from '@/lib/validations/photo-stamp'
import {
  stampPhoto,
  sha256,
  extractExif,
  resolveCapturedAt,
} from '@/lib/services/photo-stamper'
import { SecureError } from '@/lib/utils/secure-error-handler'

const BUCKET = 'survey-photos'

/**
 * POST /api/site-surveys/[id]/photos/stamp
 *
 * Forensic stamping pipeline. The PWA uploads the original to
 * `{orgId}/originals/surveys/{surveyId}/...` directly (so the network
 * doesn't double-hop through a serverless function), then calls this
 * endpoint with the EXIF metadata it pulled client-side. The server:
 *
 *   1. Re-verifies the original path belongs to the caller's org +
 *      survey — the only thing the client controls is the photoId.
 *   2. Downloads the original via service role (RLS blocks non-admin
 *      reads of `originals/`, which is the whole point of the prefix).
 *   3. Computes SHA-256 — tamper-evident hash of the bytes as uploaded.
 *   4. Re-extracts EXIF server-side — defense-in-depth in case the
 *      client missed a tag.
 *   5. Resolves capture time (EXIF → client → server upload time).
 *   6. Renders the stamp via `stampPhoto()` and uploads the JPEG to
 *      `{orgId}/stamped/surveys/{surveyId}/...`.
 *
 * Stamping failures DO NOT roll back the original — we return
 * `stampStatus: 'failed'` and let the admin restamp endpoint pick it
 * up later. The original is the source of truth.
 *
 * The endpoint does NOT update site_surveys.photo_metadata directly —
 * the client owns that JSONB write to avoid clobbering the in-flight
 * survey-store autosave. The client merges the response into its store
 * and persists in the next autosave tick.
 */
export const POST = createApiHandlerWithParams(
  {
    allowedRoles: ROLES.TENANT_FIELD,
    bodySchema: photoStampPayloadSchema,
    rateLimit: 'upload',
  },
  async (_request, context, params, body) => {
    // 1. Survey ownership check.
    const { data: survey } = await context.supabase
      .from('site_surveys')
      .select('id, organization_id, job_name')
      .eq('id', params.id)
      .single()

    if (!survey || survey.organization_id !== context.profile.organization_id) {
      throw new SecureError('NOT_FOUND', 'Survey not found')
    }

    // 2. Path injection guard. The client supplies the path so it can
    //    write originals from any device — but we tightly bound the
    //    namespace it's allowed to ask us to read.
    const expectedPrefix = `${context.profile.organization_id}/originals/surveys/${params.id}/`
    if (!body.originalPath.startsWith(expectedPrefix)) {
      throw new SecureError(
        'FORBIDDEN',
        'Original path does not match survey context',
      )
    }

    // 3. Download original via service role (admin-only RLS prefix).
    const admin = createAdminClient()
    const { data: file, error: downloadErr } = await admin.storage
      .from(BUCKET)
      .download(body.originalPath)

    if (downloadErr || !file) {
      throw new SecureError(
        'NOT_FOUND',
        `Original not retrievable from storage: ${downloadErr?.message ?? 'empty body'}`,
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = sha256(buffer)
    const fileSize = buffer.byteLength

    // 4. EXIF extraction. Server-side re-parse — client may have missed
    //    fields, and forensic trail wants the server's reading anyway.
    const exif = await extractExif(buffer)

    // 5. Resolve captured time. EXIF wins; then client-reported; then
    //    server upload time as the bounded last resort.
    const exifAt =
      exif.capturedAt ?? (body.exifCapturedAt ? new Date(body.exifCapturedAt) : null)
    const clientAt = body.clientCapturedAt ? new Date(body.clientCapturedAt) : null
    const uploadedAt = new Date()
    const captured = resolveCapturedAt({
      exif: exifAt,
      client: clientAt,
      uploadedAt,
    })

    // GPS: prefer EXIF (most defensible — written by the camera at
    // shutter time) over the client-supplied geolocation API reading.
    const gps = exif.gps ?? body.gps ?? null

    // 6. Tech name. Format as "F. Lastname"; fall back to email local
    //    part; finally to 'Unknown Operator'. Never fail the upload
    //    just because the operator's profile is sparse.
    const { data: techProfile } = await context.supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', context.user.id)
      .single()

    const techName = formatTechName({
      firstName: techProfile?.first_name ?? null,
      lastName: techProfile?.last_name ?? null,
      email: techProfile?.email ?? context.user.email ?? null,
    })

    // 7. Job number. If a job was created from this survey, use its
    //    job_number; otherwise stamp the first 8 chars of the survey
    //    id so the stamp still has a unique identifier.
    const { data: job } = await context.supabase
      .from('jobs')
      .select('job_number')
      .eq('site_survey_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const jobNumber =
      (job?.job_number as string | undefined) ?? `S${params.id.slice(0, 8)}`

    // 8. Timezone. Org-level setting unless the client passes an
    //    explicit override (used when re-stamping historical photos
    //    from a different zone).
    const { data: org } = await context.supabase
      .from('organizations')
      .select('timezone')
      .eq('id', context.profile.organization_id)
      .single()

    const timezone =
      body.timezoneOverride ?? (org?.timezone as string | undefined) ?? 'America/Chicago'

    // 9. Compute stamped path: same shape as the original but under
    //    `stamped/` and always normalized to .jpg.
    const stampedPath = body.originalPath
      .replace('/originals/', '/stamped/')
      .replace(/\.[a-z0-9]+$/i, '.jpg')

    // 10. Render and upload. Failures are caught and surfaced as a
    //     soft error; the original remains intact.
    let stampStatus: 'stamped' | 'failed' = 'stamped'
    let stampError: string | null = null

    try {
      const stamped = await stampPhoto(buffer, {
        capturedAt: captured.value,
        jobNumber: String(jobNumber),
        techName,
        gps,
        timezone,
      })

      const { error: uploadErr } = await admin.storage
        .from(BUCKET)
        .upload(stampedPath, stamped, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadErr) throw uploadErr
    } catch (err) {
      stampStatus = 'failed'
      stampError = err instanceof Error ? err.message : 'Unknown stamp error'
      context.log.error(
        {
          err,
          photoId: body.photoId,
          originalPath: body.originalPath,
        },
        'Photo stamp failed',
      )
    }

    return NextResponse.json({
      stampStatus,
      stampError,
      originalPath: body.originalPath,
      stampedPath: stampStatus === 'stamped' ? stampedPath : null,
      fileHash,
      fileSize,
      capturedAt: captured.value.toISOString(),
      capturedAtSource: captured.source,
      capturedLat: gps?.lat ?? null,
      capturedLng: gps?.lng ?? null,
      deviceMake: exif.deviceMake,
      deviceModel: exif.deviceModel,
      exifRaw: exif.raw,
    })
  },
)

function formatTechName({
  firstName,
  lastName,
  email,
}: {
  firstName: string | null
  lastName: string | null
  email: string | null
}): string {
  const initial = firstName?.[0]
  if (initial && lastName) return `${initial}. ${lastName}`
  if (firstName && lastName) return `${firstName} ${lastName}`
  if (firstName) return firstName
  if (lastName) return lastName
  if (email) return email.split('@')[0] || 'Unknown Operator'
  return 'Unknown Operator'
}
