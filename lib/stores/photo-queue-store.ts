'use client'

import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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
      // Persist only metadata for *uploaded* photos — we need their
      // remote URLs and categorization to finish the survey form, and
      // their size is already bounded. Pending / uploading / failed
      // rows carry the full base64 `localUri`, which at 4 photos can
      // blow past the 5–10 MB localStorage quota, silently truncate
      // the persisted blob, and leave the upload queue in a state
      // where every retry fails with "Failed to fetch" (the string
      // parses as invalid data: URL). Losing a pending photo on
      // refresh is annoying but recoverable — corrupting the whole
      // queue is not.
      partialize: (state) => ({
        queue: state.queue
          .filter((p) => p.status === 'uploaded')
          .map((p) => ({ ...p, localUri: '' })),
      }),
    }
  )
)
