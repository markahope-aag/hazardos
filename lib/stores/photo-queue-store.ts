'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type PhotoUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed'

export interface QueuedPhoto {
  id: string
  surveyId: string
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
const generateId = () => `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

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
      // Don't persist isProcessing state
      partialize: (state) => ({
        queue: state.queue,
      }),
    }
  )
)
