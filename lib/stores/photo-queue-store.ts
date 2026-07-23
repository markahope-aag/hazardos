'use client'

import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { deletePhotoBlob } from '@/lib/stores/photo-blob-store'

export type PhotoUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed'

export interface QueuedPhoto {
  id: string
  surveyId: string
  organizationId: string
  localUri: string // blob: or data: URL
  category: string
  location: string
  caption: string
  gpsCoordinates: { latitude: number; longitude: number } | null
  status: PhotoUploadStatus
  remoteUrl: string | null
  error: string | null
  retryCount: number
  createdAt: string
  fileSize: number | null
  fileType: string | null
  // Defaults to 'image' for entries created before video support so
  // queues persisted in localStorage from older sessions still parse.
  mediaType: 'image' | 'video'

  // Forensic pipeline carry-over: EXIF extracted client-side BEFORE the
  // canvas-compress step strips it. Sent to the stamp endpoint so the
  // server can resolve capture time and GPS even when the compressed
  // upload no longer has EXIF tags. All optional — entries from older
  // sessions or non-image uploads simply omit them.
  exifCapturedAt?: string | null
  clientCapturedAt?: string | null
  exifGps?: { lat: number; lng: number } | null
  deviceMake?: string | null
  deviceModel?: string | null
}

interface PhotoQueueState {
  queue: QueuedPhoto[]
  isProcessing: boolean

  // Actions
  addPhoto: (
    photo: Omit<QueuedPhoto, 'id' | 'status' | 'remoteUrl' | 'error' | 'retryCount' | 'createdAt'>
  ) => string
  removePhoto: (id: string) => void
  updatePhotoStatus: (
    id: string,
    status: PhotoUploadStatus,
    remoteUrl?: string | null,
    error?: string | null
  ) => void
  updatePhotoMetadata: (
    id: string,
    data: Partial<Pick<QueuedPhoto, 'category' | 'location' | 'caption'>>
  ) => void
  incrementRetryCount: (id: string) => void

  // Queue processing
  getNextPendingPhoto: () => QueuedPhoto | null
  setProcessing: (processing: boolean) => void

  // Batch operations
  retryFailed: () => void
  clearCompleted: () => void
  clearSurveyPhotos: (surveyId: string) => void

  // Queries
  getPhotosForSurvey: (surveyId: string) => QueuedPhoto[]
  getPendingCount: (surveyId?: string) => number
  getFailedCount: (surveyId?: string) => number
  getUploadedCount: (surveyId?: string) => number
}

// Generate unique IDs
const generateId = () => `photo-${Date.now()}-${nanoid(9)}`

export const usePhotoQueueStore = create<PhotoQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      isProcessing: false,

      addPhoto: (photo) => {
        const id = generateId()
        const newPhoto: QueuedPhoto = {
          ...photo,
          id,
          status: 'pending',
          remoteUrl: null,
          error: null,
          retryCount: 0,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          queue: [...state.queue, newPhoto],
        }))

        return id
      },

      removePhoto: (id) => {
        void deletePhotoBlob(id)
        set((state) => ({
          queue: state.queue.filter((p) => p.id !== id),
        }))
      },

      updatePhotoStatus: (id, status, remoteUrl, error) => {
        set((state) => ({
          queue: state.queue.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status,
                  remoteUrl: remoteUrl !== undefined ? remoteUrl : p.remoteUrl,
                  error: error !== undefined ? error : p.error,
                  // Once uploaded, the bytes live in R2 and nothing reads
                  // localUri again (getNextPendingPhoto only returns
                  // pending/failed). Drop the ~2–3MB base64 blob from memory
                  // now instead of at end-of-survey — a 100-photo survey
                  // otherwise pins hundreds of MB of base64 and OOMs mobile
                  // Safari. Persistence already strips it; this matches.
                  localUri: status === 'uploaded' ? '' : p.localUri,
                }
              : p
          ),
        }))
      },

      updatePhotoMetadata: (id, data) => {
        set((state) => ({
          queue: state.queue.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }))
      },

      incrementRetryCount: (id) => {
        set((state) => ({
          queue: state.queue.map((p) =>
            p.id === id ? { ...p, retryCount: p.retryCount + 1 } : p
          ),
        }))
      },

      getNextPendingPhoto: () => {
        const { queue } = get()
        // Get pending photos or failed photos with less than 3 retries
        return (
          queue.find(
            (p) => p.status === 'pending' || (p.status === 'failed' && p.retryCount < 3)
          ) || null
        )
      },

      setProcessing: (processing) => {
        set({ isProcessing: processing })
      },

      retryFailed: () => {
        set((state) => ({
          queue: state.queue.map((p) =>
            p.status === 'failed'
              ? { ...p, status: 'pending' as PhotoUploadStatus, error: null }
              : p
          ),
        }))
      },

      clearCompleted: () => {
        set((state) => ({
          queue: state.queue.filter((p) => p.status !== 'uploaded'),
        }))
      },

      clearSurveyPhotos: (surveyId) => {
        // Drop the IndexedDB bytes for this survey's photos too, so a
        // submitted/abandoned survey doesn't leave orphaned blobs behind.
        for (const p of get().queue) {
          if (p.surveyId === surveyId) void deletePhotoBlob(p.id)
        }
        set((state) => ({
          queue: state.queue.filter((p) => p.surveyId !== surveyId),
        }))
      },

      getPhotosForSurvey: (surveyId) => {
        return get().queue.filter((p) => p.surveyId === surveyId)
      },

      getPendingCount: (surveyId) => {
        const { queue } = get()
        const filtered = surveyId ? queue.filter((p) => p.surveyId === surveyId) : queue
        return filtered.filter(
          (p) => p.status === 'pending' || p.status === 'uploading'
        ).length
      },

      getFailedCount: (surveyId) => {
        const { queue } = get()
        const filtered = surveyId ? queue.filter((p) => p.surveyId === surveyId) : queue
        return filtered.filter((p) => p.status === 'failed').length
      },

      getUploadedCount: (surveyId) => {
        const { queue } = get()
        const filtered = surveyId ? queue.filter((p) => p.surveyId === surveyId) : queue
        return filtered.filter((p) => p.status === 'uploaded').length
      },
    }),
    {
      name: 'hazardos-photo-upload-queue',
      storage: createJSONStorage(() => localStorage),
      // Persist metadata for every not-yet-discarded photo, but ALWAYS with an
      // empty `localUri`. The heavy base64 bytes used to be the reason pending
      // rows couldn't be persisted — at a few photos they blow the 5–10 MB
      // localStorage quota, truncate the blob, and wedge the queue. Now the
      // bytes live in IndexedDB (photo-blob-store), keyed by photo id, so the
      // queue only needs the lightweight row here: on reload it knows a photo
      // is still pending and re-reads its bytes from IndexedDB to finish the
      // upload. This is what stops an offline-captured photo vanishing on a
      // reload or tab eviction.
      partialize: (state) => ({
        queue: state.queue
          .filter((p) => p.status !== 'uploaded' || Boolean(p.remoteUrl))
          .map((p) => ({ ...p, localUri: '' })),
      }),
      // An upload interrupted by a reload persists as 'uploading' and would
      // otherwise never be retried (getNextPendingPhoto only picks 'pending').
      // Reset it so the queue resumes it.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.queue = state.queue.map((p) =>
          p.status === 'uploading' ? { ...p, status: 'pending' } : p
        )
      },
    }
  )
)
