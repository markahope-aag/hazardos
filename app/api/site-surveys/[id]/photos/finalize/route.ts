import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError } from '@/lib/utils/secure-error-handler'
import {
  finalizePayloadSchema,
  buildStampedKey,
} from '@/lib/validations/photo-upload'
import {
  getObjectBuffer,
  putObject,
  headObject,
  presignDownload,
} from '@/lib/storage/r2'
import {
  stampPhoto,
  sha256,
  extractExif,
  resolveCapturedAt,
} from '@/lib/services/photo-stamper'

/**
 * POST /api/site-surveys/[id]/photos/finalize
 *
 * Called after the client successfully PUTs an original to R2 via the
 * presigned URL from /upload-url. Finalize:
 *
 *   1. Confirms the original landed in R2 (HEAD).
 *   2. For images: downloads, hashes, re-extracts EXIF, resolves
 *      capture time, renders the burned-in forensic stamp, writes
 *      the stamped JPEG back to R2.
 *   3. Denormalizes the customer/job/company linkage from the
 *      survey's relationships so customer-level photo queries don't
 *      need to JOIN through site_surveys later.
 *   4. Inserts the survey_photos row with all metadata.
 *
 * The stamp pipeline is allowed to fail soft — the original is the
 * legal artifact and is preserved either way. A failed row is marked
 * `stamp_status='failed'` and picked up by the admin /restamp endpoint
 * later. The row insert always succeeds.
 *
 * Returns the inserted row plus a fresh signed URL for the stamped
 * derivative (or the original, for videos) so the gallery can render
 * the new photo immediately without a separate sign trip.
 */
export const POST = createApiHandlerWithParams(
  {
    allowedRoles: ROLES.TENANT_FIELD,
    bodySchema: finalizePayloadSchema,
    rateLimit: 'upload',
  },
  async (_request, context, params, body) => {
    const orgId = context.profile.organization_id

    // 1. Survey ownership.
    const { data: survey } = await context.supabase
      .from('site_surveys')
      .select('id, organization_id, customer_id')
      .eq('id', params.id)
      .single()

    if (!survey || survey.organization_id !== orgId) {
      throw new SecureError('NOT_FOUND', 'Survey not found')
    }

    // 2. Path-injection guard. The client supplies the originalKey so
    //    it can hand back what /upload-url returned, but we re-verify
    //    the prefix to make sure this finalize call can't be repurposed
    //    against an arbitrary key.
    const originalsPrefix = `${orgId}/originals/surveys/${params.id}/`
    const videosPrefix = `${orgId}/videos/surveys/${params.id}/`
    const isImage = body.mediaType === 'image'
    const expectedPrefix = isImage ? originalsPrefix : videosPrefix
    if (!body.originalKey.startsWith(expectedPrefix)) {
      throw new SecureError(
        'FORBIDDEN',
        'Original key does not match survey context',
      )
    }

    // 3. Confirm the upload completed by HEADing the object. R2
    //    returns the actual content length and content type; we
    //    record both rather than trusting the client's declared
    //    values.
    const head = await headObject(body.originalKey)
    if (!head) {
      throw new SecureError(
        'NOT_FOUND',
        'Original not found in R2 — the upload may have failed silently',
      )
    }

    // Denormalize linkage from the survey row + customer row + most
    // recent job (if any was created from this survey).
    const { data: customer } = survey.customer_id
      ? await context.supabase
          .from('customers')
          .select('company_id')
          .eq('id', survey.customer_id)
          .maybeSingle()
      : { data: null }

    const { data: job } = await context.supabase
      .from('jobs')
      .select('id, job_number')
      .eq('site_survey_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Org-level retention setting. Defaults are enforced by the DB
    // CHECK constraint; we still need the value to compute expires_at.
    const { data: org } = await context.supabase
      .from('organizations')
      .select('photo_retention_days, timezone')
      .eq('id', orgId)
      .single()

    const retentionDays = (org?.photo_retention_days as number | undefined) ?? 1095
    const timezone =
      body.timezoneOverride ?? (org?.timezone as string | undefined) ?? 'America/Chicago'

    // Stamping (images only). Failures don't roll back the row — the
    // original is the legal source and we want the survey_photos row
    // present so the admin restamp endpoint can find it.
    let stampStatus: 'stamped' | 'failed' | 'skipped' = isImage ? 'stamped' : 'skipped'
    let stampError: string | null = null
    let stampedKey: string | null = null
    let fileHash: string | null = null
    let capturedAt: Date = new Date()
    let capturedAtSource: 'exif' | 'client' | 'server' = 'server'
    let exif: Awaited<ReturnType<typeof extractExif>> | null = null
    let gpsResolved = body.gps ?? null

    if (isImage) {
      try {
        const buffer = await getObjectBuffer(body.originalKey)
        fileHash = sha256(buffer)
        exif = await extractExif(buffer)

        const exifAt =
          exif.capturedAt
          ?? (body.exifCapturedAt ? new Date(body.exifCapturedAt) : null)
        const clientAt = body.clientCapturedAt ? new Date(body.clientCapturedAt) : null
        const resolved = resolveCapturedAt({
          exif: exifAt,
          client: clientAt,
          uploadedAt: new Date(),
        })
        capturedAt = resolved.value
        capturedAtSource = resolved.source

        // EXIF GPS wins over the client-supplied geolocation reading
        // — it's written by the camera at shutter time and is the
        // more defensible artifact in litigation.
        gpsResolved = exif.gps ?? body.gps ?? null

        // Tech name + job number for the stamp band.
        const { data: techProfile } = await context.supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', context.user.id)
          .single()

        const techName = formatTechName({
          firstName: (techProfile?.first_name as string | null) ?? null,
          lastName: (techProfile?.last_name as string | null) ?? null,
          email: (techProfile?.email as string | null) ?? context.user.email ?? null,
        })

        const jobNumber =
          (job?.job_number as string | undefined) ?? `S${params.id.slice(0, 8)}`

        const stampedBuffer = await stampPhoto(buffer, {
          capturedAt,
          jobNumber: String(jobNumber),
          techName,
          gps: gpsResolved,
          timezone,
        })

        stampedKey = buildStampedKey({
          organizationId: orgId,
          surveyId: params.id,
          category: body.category,
          photoId: body.photoId,
        })

        await putObject({
          key: stampedKey,
          body: stampedBuffer,
          contentType: 'image/jpeg',
        })
      } catch (err) {
        stampStatus = 'failed'
        stampError = err instanceof Error ? err.message : 'Unknown stamp error'
        stampedKey = null
        context.log.error(
          { err, photoId: body.photoId, originalKey: body.originalKey },
          'Photo stamp failed during finalize',
        )
      }
    }

    // Insert the survey_photos row. We use the service role client
    // here implicitly via context.supabase being the user's session;
    // RLS allows org members to insert as long as organization_id
    // matches their org, which it does.
    const insertPayload = {
      organization_id: orgId,
      site_survey_id: params.id,
      job_id: (job?.id as string | undefined) ?? null,
      customer_id: survey.customer_id ?? null,
      company_id: (customer?.company_id as string | undefined) ?? null,
      legacy_id: body.photoId,
      category: body.category,
      location: body.location ?? null,
      caption: body.caption ?? null,
      area_id: body.areaId ?? null,
      captured_at: capturedAt.toISOString(),
      captured_at_source: capturedAtSource,
      captured_lat: gpsResolved?.lat ?? null,
      captured_lng: gpsResolved?.lng ?? null,
      device_make: exif?.deviceMake ?? body.deviceMake ?? null,
      device_model: exif?.deviceModel ?? body.deviceModel ?? null,
      exif_raw: exif?.raw ?? null,
      media_type: body.mediaType,
      mime_type: head.contentType ?? body.mimeType ?? null,
      file_size: head.contentLength ?? null,
      file_hash: fileHash,
      original_r2_key: body.originalKey,
      stamped_r2_key: stampedKey,
      tier: 'hot' as const,
      tier_changed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + retentionDays * 86400 * 1000).toISOString(),
      stamp_status: stampStatus,
      stamp_error: stampError,
    }

    const { data: photo, error: insertError } = await context.supabase
      .from('survey_photos')
      .insert(insertPayload)
      .select()
      .single()

    if (insertError) {
      context.log.error(
        { err: insertError, photoId: body.photoId },
        'Failed to insert survey_photos row',
      )
      throw new SecureError(
        'BAD_REQUEST',
        `Failed to record photo: ${insertError.message}`,
      )
    }

    // Sign the display URL — stamped for images (or the original if
    // stamping failed), and the original for videos. Saves the client
    // a follow-up sign call to render the just-uploaded photo.
    const displayKey = stampedKey ?? body.originalKey
    const signedDisplayUrl = await presignDownload({ key: displayKey })

    return NextResponse.json({
      photo,
      signedDisplayUrl,
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
