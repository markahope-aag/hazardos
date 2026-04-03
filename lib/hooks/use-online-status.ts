'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { processPhotoQueue } from '@/lib/services/photo-upload-service'
import { useSurveyStore } from '@/lib/stores/survey-store'

/**
 * Hook to track online/offline status.
 * Does NOT subscribe to store state — avoids re-render cascades.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Hook that provides sync functions and status.
 * Subscribes to store only for display values, not for effect dependencies.
 */
export function useOnlineSync() {
  const isOnline = useOnlineStatus()
  const isDirty = useSurveyStore((state) => state.isDirty)
  const isSyncing = useSurveyStore((state) => state.isSyncing)
  const syncError = useSurveyStore((state) => state.syncError)

  // Use refs for values needed in callbacks to avoid re-render loops
  const isOnlineRef = useRef(isOnline)
  isOnlineRef.current = isOnline

  const syncNow = useCallback(async () => {
    if (!isOnlineRef.current) return false
    await processPhotoQueue()
    return useSurveyStore.getState().saveDraft()
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      const state = useSurveyStore.getState()
      if (state.isDirty) {
        state.saveDraft()
      }
      processPhotoQueue()
    }
  }, [isOnline])

  return {
    isOnline,
    isDirty,
    isSyncing,
    syncError,
    syncNow,
    retrySync: syncNow,
  }
}

/**
 * Hook specifically for photo upload queue status
 */
export function usePhotoUploadStatus(surveyId: string | null) {
  const [status, setStatus] = useState({
    total: 0,
    uploaded: 0,
    pending: 0,
    failed: 0,
    progress: 100,
  })

  useEffect(() => {
    if (!surveyId) return

    const updateStatus = async () => {
      const { getUploadProgress } = await import('@/lib/services/photo-upload-service')
      setStatus(getUploadProgress(surveyId))
    }

    updateStatus()

    const interval = setInterval(updateStatus, 1000)
    return () => clearInterval(interval)
  }, [surveyId])

  return status
}
