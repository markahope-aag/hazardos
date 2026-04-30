'use client'

import { createClient } from '@/lib/supabase/client'
import { usePhotoQueueStore, QueuedPhoto } from '@/lib/stores/photo-queue-store'
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

/**
 * Upload an arbitrary blob to the survey-photos bucket. Returns the
 * storage path (the source of truth for the saved metadata) and a
 * signed URL the caller can use immediately for previewing the upload.
 *
 * Used by the desktop drag-drop flow and the mobile video direct-upload
 * path; the queued photo path goes through {@link uploadPhotoToStorage}
 * so it can persist retry state.
 *
 * The bucket is private; getPublicUrl() returns 400 in the browser. Only
 * signed URLs (or authenticated requests) work for reads.
 */
export async function uploadSurveyMediaBlob({
  organizationId,
  surveyId,
  category,
  mediaId,
  blob,
  mimeType,
}: {
  organizationId: string
  surveyId: string
  category: string
  mediaId: string
  blob: Blob
  mimeType: string
}): Promise<{ path: string; signedUrl: string }> {
  const supabase = createClient()
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    throw new SecureError('UNAUTHORIZED', 'Your session expired — sign in again and retry.')
  }

  const rawExt = (mimeType.split('/')[1] || 'bin')
    .replace('jpeg', 'jpg')
    .replace('quicktime', 'mov')
    .replace(/[^a-z0-9]/gi, '')
  const path = `${organizationId}/surveys/${surveyId}/${category}/${mediaId}.${rawExt}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, { contentType: mimeType, upsert: true })

  if (error) {
    const msg = error.message || 'Upload failed'
    if (/payload too large|file size|413|exceeded/i.test(msg)) {
      throw new SecureError(
        'BAD_REQUEST',
        'File is too large — max 250 MB per upload.',
      )
    }
    if (/mime|content[- ]type/i.test(msg)) {
      throw new SecureError(
        'BAD_REQUEST',
        'That file type is not allowed — upload an image or video.',
      )
    }
    throw new SecureError('BAD_REQUEST', `Upload failed: ${msg}`)
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (signErr || !signed?.signedUrl) {
    throw new SecureError(
      'BAD_REQUEST',
      `Upload succeeded but URL signing failed: ${signErr?.message || 'unknown error'}`,
    )
  }

  return { path, signedUrl: signed.signedUrl }
}

/**
 * Generate a fresh signed URL for an existing storage path. Returns null
 * on failure rather than throwing — the caller usually wants to render
 * a placeholder, not crash the gallery.
 */
export async function getSignedSurveyMediaUrl(path: string): Promise<string | null> {
  if (!path) return null
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
 * Batch sign multiple paths in one round trip. Falls back to per-item
 * signing for any that fail.
 */
export async function getSignedSurveyMediaUrls(
  paths: string[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  if (paths.length === 0) return result
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
  if (error || !data) {
    log.warn({ error: error?.message, count: paths.length }, 'Batch sign failed')
    return result
  }
  for (const item of data) {
    if (item.path && item.signedUrl) {
      result[item.path] = item.signedUrl
    }
  }
  return result
}

/**
 * Upload a single photo to Supabase Storage. Errors bubble up with
 * messages that point at the actual failure (auth, quota, network) so
 * the UI can surface something more useful than "Failed to fetch".
 */
export async function uploadPhotoToStorage(photo: QueuedPhoto): Promise<string> {
  if (!photo.organizationId || !photo.surveyId) {
    throw new SecureError(
      'BAD_REQUEST',
      'Photo is missing organization or survey context — reopen the survey and recapture.',
    )
  }

  const supabase = createClient()

  // Confirm there's still an authenticated session. If the token has
  // silently expired the upload request hits the storage endpoint with
  // no credentials and Supabase returns a bare 403 that the SDK surfaces
  // as a vague network error.
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    throw new SecureError('UNAUTHORIZED', 'Your session expired — sign in again and retry.')
  }

  let blob: Blob
  try {
    if (photo.localUri.startsWith('data:')) {
      blob = dataUrlToBlob(photo.localUri)
    } else {
      // blob: or http: URL (e.g. survive reload cases that use object URLs)
      const response = await fetch(photo.localUri)
      if (!response.ok) {
        throw new Error(`Could not read photo data (${response.status})`)
      }
      blob = await response.blob()
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    throw new SecureError('BAD_REQUEST', `Couldn't read photo from device: ${msg}`)
  }

  // Determine file extension from MIME type. Use the queued fileType
  // first (set at capture time) and fall back to the blob's type, since
  // some browsers strip the type from a Blob reconstructed from a data
  // URL. Default to image/jpeg for the legacy photo path.
  const mimeType = photo.fileType || blob.type || 'image/jpeg'
  const rawExt = mimeType.split('/')[1] || 'bin'
  // jpeg → jpg, quicktime → mov for human-readable filenames in storage.
  const extension = rawExt
    .replace('jpeg', 'jpg')
    .replace('quicktime', 'mov')
    .replace(/[^a-z0-9]/gi, '')

  // Generate storage path: {orgId}/surveys/{surveyId}/{category}/{photoId}.{ext}
  // Org ID as first folder segment enables org-scoped RLS on storage.objects
  const path = `${photo.organizationId}/surveys/${photo.surveyId}/${photo.category}/${photo.id}.${extension}`

  // Upload to Supabase Storage. Catch TypeError separately — that's the
  // "Failed to fetch" bucket (CORS, DNS, connection drop) vs the
  // structured-error bucket (RLS denial, bad bucket, quota).
  let uploadError: unknown = null
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, {
        contentType: mimeType,
        upsert: true,
      })
    uploadError = error
  } catch (err) {
    uploadError = err
  }

  if (uploadError) {
    const msg = uploadError instanceof Error ? uploadError.message : String(uploadError)
    if (/failed to fetch|network|load failed/i.test(msg)) {
      throw new SecureError(
        'BAD_REQUEST',
        'Network error reaching storage — check your connection and try again.',
      )
    }
    if (/row-level security|rls|unauthori[sz]ed|forbidden|403/i.test(msg)) {
      throw new SecureError(
        'BAD_REQUEST',
        "You don't have permission to upload to this survey. Sign out and back in, or contact an admin.",
      )
    }
    if (/payload too large|file size|413|exceeded/i.test(msg)) {
      throw new SecureError(
        'BAD_REQUEST',
        'Photo is too large even after compression — reduce resolution and retry.',
      )
    }
    throw new SecureError('BAD_REQUEST', `Upload failed: ${msg}`)
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)

  return publicUrl
}

/**
 * Process the photo upload queue
 * This function is idempotent and can be called multiple times safely
 */
export async function processPhotoQueue(): Promise<void> {
  const store = usePhotoQueueStore.getState()

  // Already processing, skip
  if (store.isProcessing) {
    return
  }

  // Check if online
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

      // Mark as uploading
      store.updatePhotoStatus(photo.id, 'uploading')

      try {
        const remoteUrl = await uploadPhotoToStorage(photo)
        store.updatePhotoStatus(photo.id, 'uploaded', remoteUrl, null)
        uploadCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        store.incrementRetryCount(photo.id)
        store.updatePhotoStatus(photo.id, 'failed', null, errorMessage)

        // Previous version had a precedence bug — `x || 0 >= 3`
        // parses as `x || (0 >= 3)` = `x || false`, so the max-retries
        // branch effectively never fired. This uses explicit grouping.
        const retryCount =
          store.queue.find((p) => p.id === photo.id)?.retryCount ?? 0
        if (retryCount >= RETRY_DELAYS_MS.length) {
          log.error(
            { photoId: photo.id, errorMessage, retryCount },
            'Photo failed after max retries',
          )
        } else {
          // Exponential backoff between retries within the same batch.
          const delay = RETRY_DELAYS_MS[Math.min(retryCount, RETRY_DELAYS_MS.length - 1)]
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
  } finally {
    store.setProcessing(false)
  }

  // Check if there are more photos to process
  const remainingPending = store.getPendingCount()
  if (remainingPending > 0) {
    // Schedule another batch
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

  // Start processing if not already
  processPhotoQueue()

  while (Date.now() - startTime < timeoutMs) {
    const progress = getUploadProgress(surveyId)

    // All done
    if (progress.pending === 0) {
      return progress.failed === 0
    }

    // Wait a bit before checking again
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  // Timeout
  log.warn('Upload wait timeout reached')
  return false
}
