'use client'

import { createClient } from '@/lib/supabase/client'
import { usePhotoQueueStore, QueuedPhoto } from '@/lib/stores/photo-queue-store'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { createServiceLogger } from '@/lib/utils/logger'
import { SecureError } from '@/lib/utils/secure-error-handler'

const log = createServiceLogger('PhotoUploadService')
const STORAGE_BUCKET = 'survey-photos'
const MAX_CONCURRENT_UPLOADS = 2
// Exponential backoff: 2s → 4s → 8s (cap). Transient network blips are
// the most common cause of the raw-fetch TypeError we see in the wild,
// and a quick second attempt usually succeeds. Previously fixed 2s.
const RETRY_DELAYS_MS = [2000, 4000, 8000]
// Signed URL TTL — long enough for a survey-detail session without
// burning through the signing service. Browser caches the rendered
// media for the same TTL.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 8 // 8 hours

// "r2:" prefix marks a stored path as an R2 key so the signed-URL
// resolver knows to call the R2 endpoint rather than Supabase Storage.
// Legacy paths (no prefix) continue to route through Supabase, which
// keeps every pre-cutover photo working without a backfill of the
// JSONB column.
const R2_PATH_PREFIX = 'r2:'

export function isR2Path(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith(R2_PATH_PREFIX)
}

export function r2KeyFromPath(value: string): string {
  return value.startsWith(R2_PATH_PREFIX) ? value.slice(R2_PATH_PREFIX.length) : value
}

export function r2PathFromKey(key: string): string {
  return `${R2_PATH_PREFIX}${key}`
}

/**
 * Turn a data URL back into a Blob without `fetch()`. Some browsers (and
 * some proxies between the browser and us) throw "TypeError: Failed to
 * fetch" on very large data URLs even when the content is valid. Parsing
 * the base64 directly bypasses that and keeps the upload path off the
 * browser's fetch connection pool.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const commaIdx = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || commaIdx < 0) {
    throw new Error('Photo data is no longer available on this device — recapture it.')
  }
  const header = dataUrl.slice(5, commaIdx) // e.g. "image/jpeg;base64"
  const [mimeType = 'image/jpeg', encoding] = header.split(';')
  const data = dataUrl.slice(commaIdx + 1)
  const binary =
    encoding === 'base64' ? atob(data) : decodeURIComponent(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

interface UploadUrlResponse {
  uploadUrl: string
  key: string
}

interface FinalizeResponse {
  photo: {
    id: string
    original_r2_key: string | null
    stamped_r2_key: string | null
    file_hash: string | null
    captured_at: string | null
    captured_at_source: 'exif' | 'client' | 'server' | null
    captured_lat: number | null
    captured_lng: number | null
    device_make: string | null
    device_model: string | null
    stamp_status: 'pending' | 'stamped' | 'failed' | 'skipped' | null
    stamp_error: string | null
  }
  signedDisplayUrl: string
}

async function requestUploadUrl(args: {
  surveyId: string
  photoId: string
  mediaType: 'image' | 'video'
  contentType: string
  contentLength: number
  category: string
}): Promise<UploadUrlResponse> {
  const response = await fetch(`/api/site-surveys/${args.surveyId}/photos/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      photoId: args.photoId,
      mediaType: args.mediaType,
      contentType: args.contentType,
      contentLength: args.contentLength,
      category: args.category,
    }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`upload-url failed (${response.status}): ${text || 'unknown error'}`)
  }
  return response.json()
}

async function putToR2(uploadUrl: string, blob: Blob, contentType: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`R2 PUT failed (${response.status}): ${text || 'unknown error'}`)
  }
}

async function finalizeUpload(args: {
  surveyId: string
  photoId: string
  originalKey: string
  mediaType: 'image' | 'video'
  category: string
  location?: string
  caption?: string
  areaId?: string | null
  mimeType?: string
  exifCapturedAt?: string | null
  clientCapturedAt?: string | null
  gps?: { lat: number; lng: number } | null
  deviceMake?: string | null
  deviceModel?: string | null
}): Promise<FinalizeResponse> {
  const response = await fetch(`/api/site-surveys/${args.surveyId}/photos/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      photoId: args.photoId,
      originalKey: args.originalKey,
      mediaType: args.mediaType,
      category: args.category,
      location: args.location,
      caption: args.caption,
      areaId: args.areaId,
      mimeType: args.mimeType,
      exifCapturedAt: args.exifCapturedAt,
      clientCapturedAt: args.clientCapturedAt,
      gps: args.gps,
      deviceMake: args.deviceMake,
      deviceModel: args.deviceModel,
    }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`finalize failed (${response.status}): ${text || 'unknown error'}`)
  }
  return response.json()
}

/**
 * Upload an arbitrary blob to R2 via the presign → PUT → finalize
 * pipeline. Used by the desktop drag-drop flow where the file is a
 * `File` object the browser already holds. Returns the signed display
 * URL (stamped derivative for images, original for videos) and the
 * stored R2 paths so the caller can persist them.
 */
export async function uploadSurveyMediaBlob({
  organizationId,
  surveyId,
  category,
  mediaId,
  blob,
  mimeType,
  caption,
}: {
  organizationId: string
  surveyId: string
  category: string
  mediaId: string
  blob: Blob
  mimeType: string
  caption?: string
}): Promise<{
  /** Storage path in `r2:<key>` form, written into JSONB / survey-store. */
  path: string
  /** Display URL — stamped derivative for images, original for videos. */
  signedUrl: string
  /** R2 keys for direct reference. */
  originalKey: string
  stampedKey: string | null
  /** Forensic metadata returned by the stamp pipeline. */
  fileHash: string | null
  capturedAt: string | null
  stampStatus: 'pending' | 'stamped' | 'failed' | 'skipped' | null
}> {
  if (!organizationId) {
    throw new SecureError(
      'BAD_REQUEST',
      'Missing organization context — refresh the page and retry.',
    )
  }

  const supabase = createClient()
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    throw new SecureError('UNAUTHORIZED', 'Your session expired — sign in again and retry.')
  }

  const isImage = mimeType.startsWith('image/')
  const mediaType: 'image' | 'video' = isImage ? 'image' : 'video'

  const { uploadUrl, key } = await requestUploadUrl({
    surveyId,
    photoId: mediaId,
    mediaType,
    contentType: mimeType,
    contentLength: blob.size,
    category,
  })

  await putToR2(uploadUrl, blob, mimeType)

  const finalized = await finalizeUpload({
    surveyId,
    photoId: mediaId,
    originalKey: key,
    mediaType,
    category,
    caption,
    mimeType,
  })

  return {
    path: r2PathFromKey(finalized.photo.stamped_r2_key ?? finalized.photo.original_r2_key ?? key),
    signedUrl: finalized.signedDisplayUrl,
    originalKey: key,
    stampedKey: finalized.photo.stamped_r2_key,
    fileHash: finalized.photo.file_hash,
    capturedAt: finalized.photo.captured_at,
    stampStatus: finalized.photo.stamp_status,
  }
}

/**
 * Resolve a queued photo's local URI (data: or blob:) into a Blob the
 * R2 PUT can consume.
 */
async function blobFromLocalUri(localUri: string): Promise<Blob> {
  if (localUri.startsWith('data:')) {
    return dataUrlToBlob(localUri)
  }
  const response = await fetch(localUri)
  if (!response.ok) {
    throw new Error(`Could not read photo data (${response.status})`)
  }
  return response.blob()
}

/**
 * Upload a single queued photo to R2 and finalize it. Errors bubble
 * up with messages that point at the actual failure (auth, network,
 * stamp pipeline) so the queue can decide whether to retry.
 *
 * On success, this function ALSO mirrors the forensic metadata into
 * survey-store so the in-progress survey form sees the stamped URL
 * and capture details without a separate fetch.
 */
export async function uploadPhotoToStorage(photo: QueuedPhoto): Promise<string> {
  if (!photo.organizationId || !photo.surveyId) {
    throw new SecureError(
      'BAD_REQUEST',
      'Photo is missing organization or survey context — reopen the survey and recapture.',
    )
  }

  const supabase = createClient()

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    throw new SecureError('UNAUTHORIZED', 'Your session expired — sign in again and retry.')
  }

  let blob: Blob
  try {
    blob = await blobFromLocalUri(photo.localUri)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    throw new SecureError('BAD_REQUEST', `Couldn't read photo from device: ${msg}`)
  }

  const mimeType = photo.fileType || blob.type || (photo.mediaType === 'video' ? 'video/mp4' : 'image/jpeg')
  const mediaType: 'image' | 'video' = photo.mediaType === 'video' ? 'video' : 'image'

  let uploadUrl: string
  let key: string
  try {
    const presigned = await requestUploadUrl({
      surveyId: photo.surveyId,
      photoId: photo.id,
      mediaType,
      contentType: mimeType,
      contentLength: blob.size,
      category: photo.category,
    })
    uploadUrl = presigned.uploadUrl
    key = presigned.key
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/network|failed to fetch|load failed/i.test(msg)) {
      throw new SecureError(
        'BAD_REQUEST',
        'Network error reaching upload service — check your connection and try again.',
      )
    }
    if (/exceed|too large|413/i.test(msg)) {
      throw new SecureError(
        'BAD_REQUEST',
        'Photo is too large — reduce resolution and retry.',
      )
    }
    throw new SecureError('BAD_REQUEST', `Upload preparation failed: ${msg}`)
  }

  try {
    await putToR2(uploadUrl, blob, mimeType)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/failed to fetch|network|load failed/i.test(msg)) {
      throw new SecureError(
        'BAD_REQUEST',
        'Network error during upload — check your connection and try again.',
      )
    }
    throw new SecureError('BAD_REQUEST', `Upload failed: ${msg}`)
  }

  let finalized: FinalizeResponse
  try {
    finalized = await finalizeUpload({
      surveyId: photo.surveyId,
      photoId: photo.id,
      originalKey: key,
      mediaType,
      category: photo.category,
      location: photo.location,
      caption: photo.caption,
      areaId: photo.location || null,
      mimeType,
      exifCapturedAt: photo.exifCapturedAt ?? null,
      clientCapturedAt: photo.clientCapturedAt ?? null,
      gps: photo.exifGps
        ? photo.exifGps
        : photo.gpsCoordinates
          ? { lat: photo.gpsCoordinates.latitude, lng: photo.gpsCoordinates.longitude }
          : null,
      deviceMake: photo.deviceMake ?? null,
      deviceModel: photo.deviceModel ?? null,
    })
  } catch (err) {
    // The bytes are safely in R2 even if finalize fails. Surface the
    // error so the queue retries — the next attempt will hit the
    // duplicate-id guard on /upload-url and the operator will see
    // a clear error to recapture, OR we make finalize idempotent
    // (which is on the roadmap once we see this happen in practice).
    const msg = err instanceof Error ? err.message : String(err)
    throw new SecureError('BAD_REQUEST', `Finalize failed: ${msg}`)
  }

  // Mirror the forensic metadata into survey-store so the form sees
  // the stamp result and signed URL on its next render. Survey-store
  // remains the source of truth for the in-progress survey form;
  // survey_photos is the source of truth for the persisted record.
  useSurveyStore.getState().updatePhoto(photo.id, {
    path: r2PathFromKey(finalized.photo.stamped_r2_key ?? finalized.photo.original_r2_key ?? key),
    original_path: r2PathFromKey(finalized.photo.original_r2_key ?? key),
    stamped_path: finalized.photo.stamped_r2_key
      ? r2PathFromKey(finalized.photo.stamped_r2_key)
      : null,
    file_hash: finalized.photo.file_hash,
    captured_at: finalized.photo.captured_at,
    captured_lat: finalized.photo.captured_lat,
    captured_lng: finalized.photo.captured_lng,
    device_make: finalized.photo.device_make,
    device_model: finalized.photo.device_model,
    stamp_status: finalized.photo.stamp_status,
    stamp_error: finalized.photo.stamp_error,
  })

  return finalized.signedDisplayUrl
}

/**
 * Generate a fresh signed URL for an existing storage path. Returns
 * null on failure rather than throwing — the caller usually wants to
 * render a placeholder, not crash the gallery.
 *
 * Routes to the R2 signing endpoint when the path carries the `r2:`
 * prefix; otherwise falls through to the legacy Supabase Storage
 * signer so pre-cutover photos continue to render.
 */
export async function getSignedSurveyMediaUrl(path: string): Promise<string | null> {
  if (!path) return null
  if (isR2Path(path)) {
    const map = await fetchR2SignedUrls([r2KeyFromPath(path)])
    return map[r2KeyFromPath(path)] ?? null
  }
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) {
    log.warn({ path, error: error?.message }, 'Failed to sign survey media URL')
    return null
  }
  return data.signedUrl
}

/**
 * Batch sign multiple paths in one round trip. Splits R2 keys and
 * Supabase paths and dispatches each set to the right backend.
 */
export async function getSignedSurveyMediaUrls(
  paths: string[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  if (paths.length === 0) return result

  const r2Paths = paths.filter(isR2Path)
  const supabasePaths = paths.filter((p) => !isR2Path(p))

  if (r2Paths.length > 0) {
    const r2Map = await fetchR2SignedUrls(r2Paths.map(r2KeyFromPath))
    for (const original of r2Paths) {
      const signed = r2Map[r2KeyFromPath(original)]
      if (signed) result[original] = signed
    }
  }

  if (supabasePaths.length > 0) {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrls(supabasePaths, SIGNED_URL_TTL_SECONDS)
    if (error || !data) {
      log.warn(
        { error: error?.message, count: supabasePaths.length },
        'Batch Supabase sign failed',
      )
    } else {
      for (const item of data) {
        if (item.path && item.signedUrl) {
          result[item.path] = item.signedUrl
        }
      }
    }
  }

  return result
}

async function fetchR2SignedUrls(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {}
  try {
    const response = await fetch('/api/storage/r2-signed-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    })
    if (!response.ok) {
      log.warn({ status: response.status }, 'R2 sign endpoint failed')
      return {}
    }
    const json = (await response.json()) as { urls: Record<string, string> }
    return json.urls
  } catch (err) {
    log.warn({ err }, 'R2 sign endpoint network error')
    return {}
  }
}

/**
 * Process the photo upload queue
 * This function is idempotent and can be called multiple times safely
 */
export async function processPhotoQueue(): Promise<void> {
  const store = usePhotoQueueStore.getState()

  if (store.isProcessing) {
    return
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    log.debug('Offline - skipping photo queue processing')
    return
  }

  store.setProcessing(true)

  try {
    let uploadCount = 0

    while (uploadCount < MAX_CONCURRENT_UPLOADS) {
      const photo = store.getNextPendingPhoto()
      if (!photo) break

      store.updatePhotoStatus(photo.id, 'uploading')

      try {
        const remoteUrl = await uploadPhotoToStorage(photo)
        store.updatePhotoStatus(photo.id, 'uploaded', remoteUrl, null)
        uploadCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        store.incrementRetryCount(photo.id)
        store.updatePhotoStatus(photo.id, 'failed', null, errorMessage)

        const retryCount =
          store.queue.find((p) => p.id === photo.id)?.retryCount ?? 0
        if (retryCount >= RETRY_DELAYS_MS.length) {
          log.error(
            { photoId: photo.id, errorMessage, retryCount },
            'Photo failed after max retries',
          )
        } else {
          const delay = RETRY_DELAYS_MS[Math.min(retryCount, RETRY_DELAYS_MS.length - 1)]
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
  } finally {
    store.setProcessing(false)
  }

  const remainingPending = store.getPendingCount()
  if (remainingPending > 0) {
    setTimeout(() => processPhotoQueue(), 100)
  }
}

/**
 * Get uploaded photo URLs for a survey
 * Returns only successfully uploaded photos with their remote URLs
 */
export function getUploadedPhotoUrls(
  surveyId: string
): Array<{
  id: string
  url: string
  category: string
  location: string
  caption: string
  gpsCoordinates: { latitude: number; longitude: number } | null
}> {
  const store = usePhotoQueueStore.getState()
  const surveyPhotos = store.getPhotosForSurvey(surveyId)

  return surveyPhotos
    .filter((p) => p.status === 'uploaded' && p.remoteUrl)
    .map((p) => ({
      id: p.id,
      url: p.remoteUrl!,
      category: p.category,
      location: p.location,
      caption: p.caption,
      gpsCoordinates: p.gpsCoordinates,
    }))
}

/**
 * Check if all photos for a survey have been uploaded
 */
export function areAllPhotosUploaded(surveyId: string): boolean {
  const store = usePhotoQueueStore.getState()
  const surveyPhotos = store.getPhotosForSurvey(surveyId)

  if (surveyPhotos.length === 0) return true

  return surveyPhotos.every((p) => p.status === 'uploaded')
}

/**
 * Get upload progress for a survey
 */
export function getUploadProgress(surveyId: string): {
  total: number
  uploaded: number
  pending: number
  failed: number
  progress: number
} {
  const store = usePhotoQueueStore.getState()
  const surveyPhotos = store.getPhotosForSurvey(surveyId)

  const total = surveyPhotos.length
  const uploaded = surveyPhotos.filter((p) => p.status === 'uploaded').length
  const pending = surveyPhotos.filter(
    (p) => p.status === 'pending' || p.status === 'uploading'
  ).length
  const failed = surveyPhotos.filter((p) => p.status === 'failed').length

  return {
    total,
    uploaded,
    pending,
    failed,
    progress: total > 0 ? Math.round((uploaded / total) * 100) : 100,
  }
}

/**
 * Wait for all photos in a survey to finish uploading
 * Returns true if all uploaded successfully, false if any failed
 */
export async function waitForUploads(
  surveyId: string,
  timeoutMs: number = 60000
): Promise<boolean> {
  const startTime = Date.now()

  processPhotoQueue()

  while (Date.now() - startTime < timeoutMs) {
    const progress = getUploadProgress(surveyId)

    if (progress.pending === 0) {
      return progress.failed === 0
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  log.warn('Upload wait timeout reached')
  return false
}
