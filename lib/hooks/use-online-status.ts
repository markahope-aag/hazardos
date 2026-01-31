'use client'

import { useEffect, useState, useCallback } from 'react'
import { processPhotoQueue } from '@/lib/services/photo-upload-service'
import { useSurveyStore } from '@/lib/stores/survey-store'

/**
 * Hook to track online/offline status and automatically process queues when coming online
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const saveDraft = useSurveyStore((state) => state.saveDraft)
  const isDirty = useSurveyStore((state) => state.isDirty)

  const handleOnline = useCallback(() => {
    setIsOnline(true)

    // Auto-process photo queue when coming online
    processPhotoQueue()

    // If there are unsaved changes, sync them
    if (isDirty) {
      saveDraft()
    }
  }, [isDirty, saveDraft])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
  }, [])

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return isOnline
}

/**
 * Hook that provides both status and manual retry functions
 */
export function useOnlineSync() {
  const isOnline = useOnlineStatus()
  const saveDraft = useSurveyStore((state) => state.saveDraft)
  const isDirty = useSurveyStore((state) => state.isDirty)
  const isSyncing = useSurveyStore((state) => state.isSyncing)
  const syncError = useSurveyStore((state) => state.syncError)

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      console.warn('Cannot sync while offline')
      return false
    }

    // Process photo queue
    await processPhotoQueue()

    // Save survey data
    return saveDraft()
  }, [isOnline, saveDraft])

  const retrySync = useCallback(async () => {
    if (!isOnline) return false
    return syncNow()
  }, [isOnline, syncNow])

  return {
    isOnline,
    isDirty,
    isSyncing,
    syncError,
    syncNow,
    retrySync,
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

    // Dynamically import to avoid circular dependencies
    const updateStatus = async () => {
      const { getUploadProgress } = await import('@/lib/services/photo-upload-service')
      setStatus(getUploadProgress(surveyId))
    }

    // Update immediately
    updateStatus()

    // Update periodically while there are pending uploads
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [surveyId])

  return status
}
