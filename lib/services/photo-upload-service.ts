'use client'

import { createClient } from '@/lib/supabase/client'
import { usePhotoQueueStore, QueuedPhoto } from '@/lib/stores/photo-queue-store'

const STORAGE_BUCKET = 'survey-photos'
const MAX_CONCURRENT_UPLOADS = 2
const RETRY_DELAY_MS = 2000

/**
 * Upload a single photo to Supabase Storage
 */
export async function uploadPhotoToStorage(photo: QueuedPhoto): Promise<string> {
  const supabase = createClient()

  // Convert data URL or blob URL to blob
  const response = await fetch(photo.localUri)
  const blob = await response.blob()

  // Determine file extension from MIME type
  const mimeType = blob.type || 'image/jpeg'
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'

  // Generate storage path: surveys/{surveyId}/{category}/{photoId}.{ext}
  const path = `surveys/${photo.surveyId}/${photo.category}/${photo.id}.${extension}`

  // Upload to Supabase Storage
  const { data: _data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, {
      contentType: mimeType,
      upsert: true,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
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

        // If we hit max retries, don't try again immediately
        if (store.queue.find((p) => p.id === photo.id)?.retryCount || 0 >= 3) {
          // Photo upload failed after max retries - status is already 'failed' in store
        } else {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
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

  // Timeout reached
  return false
}
