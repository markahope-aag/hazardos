import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/auth/roles'
import { restampPayloadSchema } from '@/lib/validations/photo-stamp'
import {
  stampPhoto,
  sha256,
  extractExif,
  resolveCapturedAt,
} from '@/lib/services/photo-stamper'
import { SecureError } from '@/lib/utils/secure-error-handler'
import type { SurveyPhotoMetadata } from '@/types/database'

const BUCKET = 'survey-photos'

/**
 * POST /api/site-surveys/photos/restamp
 *
 * Admin-triggered retry for photos whose first stamp attempt failed
 * (sharp crash, transient memory issue, weird input format). Walks the
 * survey's `photo_metadata` JSONB, finds the matching photoId, re-runs
 * the pipeline against `original_path`, and patches the JSONB with the
 * new stamp result.
 *
 * Unlike the main stamp endpoint, this DOES write to site_surveys.
 * That's safe here because the operation is idempotent (last-write
 * wins on the same photo entry) and admin retries are rare enough that
 * concurrent client autosaves are unlikely to interleave.
 *
 * Pass `force: true` to re-stamp a photo that already succeeded — used
 * when the stamp overlay format changes or when timezone/job metadata
 * needs correcting after the fact.
 */
export const POST = createApiHandler(
  {
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: restampPayloadSchema,
    rateLimit: 'general',
  },
  async (_request, context, body) => {
    const admin = createAdminClient()

    // Load the survey and the org's timezone in one shot. Use the
    // user-scoped client so RLS still enforces org tenancy on this
    // read; the service-role admin client is only used for storage.
    const { data: survey } = await context.supabase
      .from('site_surveys')
      .select('id, organization_id, photo_metadata')
      .eq('id', body.surveyId)
      .single()

    if (!survey || survey.organization_id !== context.profile.organization_id) {
      throw new SecureError('NOT_FOUND', 'Survey not found')
    }

    const photos = (survey.photo_metadata as SurveyPhotoMetadata[] | null) ?? []
    const idx = photos.findIndex((p) => p.id === body.photoId)
    if (idx < 0) {
      throw new SecureError('NOT_FOUND', 'Photo not found on this survey')
    }

    const photo = photos[idx]
    const originalPath = photo.original_path ?? photo.path
    if (!originalPath) {
      throw new SecureError(
        'BAD_REQUEST',
        'Photo has no original_path — cannot restamp a legacy row',
      )
    }

    if (photo.stamp_status === 'stamped' && !body.force) {
      throw new SecureError(
        'CONFLICT',
        "Photo is already stamped. Pass force: true to rebuild.",
      )
    }

    // Download original via service role.
    const { data: file, error: downloadErr } = await admin.storage
      .from(BUCKET)
      .download(originalPath)
    if (downloadErr || !file) {
      throw new SecureError(
        'NOT_FOUND',
        `Original not retrievable: ${downloadErr?.message ?? 'empty body'}`,
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = sha256(buffer)
    const exif = await extractExif(buffer)

    // Prefer values stored on the photo row over re-derived ones —
    // the original stamp captured the operator's intent at upload
    // time and we want the retry to match what they expected.
    const captured = resolveCapturedAt({
      exif: exif.capturedAt ?? (photo.captured_at ? new Date(photo.captured_at) : null),
      client: photo.timestamp ? new Date(photo.timestamp) : null,
      uploadedAt: new Date(),
    })

    const gps =
      exif.gps ??
      (photo.captured_lat != null && photo.captured_lng != null
        ? { lat: photo.captured_lat, lng: photo.captured_lng }
        : photo.gpsCoordinates
        ? { lat: photo.gpsCoordinates.latitude, lng: photo.gpsCoordinates.longitude }
        : null)

    // Use a generic tech label for restamps — we don't track who took
    // the photo on a forensic basis any more, and the admin running
    // restamp is not the right name for the burn-in.
    const techName = 'Restamped'

    const { data: org } = await context.supabase
      .from('organizations')
      .select('timezone')
      .eq('id', context.profile.organization_id)
      .single()
    const timezone = (org?.timezone as string | undefined) ?? 'America/Chicago'

    const { data: job } = await context.supabase
      .from('jobs')
      .select('job_number')
      .eq('site_survey_id', body.surveyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const jobNumber =
      (job?.job_number as string | undefined) ?? `S${body.surveyId.slice(0, 8)}`

    const stampedPath = originalPath
      .replace('/originals/', '/stamped/')
      .replace(/\.[a-z0-9]+$/i, '.jpg')

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
      context.log.error({ err, photoId: body.photoId }, 'Restamp failed')
    }

    // Patch the photo entry in the JSONB array. The admin client is
    // used here so the write succeeds regardless of the user-scoped
    // RLS policy on site_surveys (admins already have it, but using
    // the same client throughout keeps the failure modes coherent).
    const updatedPhotos = [...photos]
    updatedPhotos[idx] = {
      ...photo,
      stamp_status: stampStatus,
      stamp_error: stampError,
      stamped_path: stampStatus === 'stamped' ? stampedPath : null,
      file_hash: fileHash,
      captured_at: captured.value.toISOString(),
      captured_lat: gps?.lat ?? null,
      captured_lng: gps?.lng ?? null,
      device_make: exif.deviceMake ?? photo.device_make ?? null,
      device_model: exif.deviceModel ?? photo.device_model ?? null,
      exif_raw: { ...(photo.exif_raw ?? {}), ...exif.raw },
    }

    const { error: updateErr } = await admin
      .from('site_surveys')
      .update({ photo_metadata: updatedPhotos })
      .eq('id', body.surveyId)

    if (updateErr) {
      throw new SecureError(
        'BAD_REQUEST',
        `Stamping succeeded but JSONB update failed: ${updateErr.message}`,
      )
    }

    return NextResponse.json({
      stampStatus,
      stampError,
      stampedPath: stampStatus === 'stamped' ? stampedPath : null,
      fileHash,
    })
  },
)
