'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { usePhotoQueueStore } from '@/lib/stores/photo-queue-store'
import { processPhotoQueue } from '@/lib/services/photo-upload-service'
import {
  isOfflineStorageAvailable,
  getStorageEstimate,
  getPendingSurveys,
  getPendingPhotos,
} from '@/lib/services/offline-storage-service'
import { logger, formatError } from '@/lib/utils/logger'

// Sync status
export type SyncStatus =
  | 'synced'
  | 'syncing'
  | 'pending'
  | 'offline'
  | 'error'

export interface OfflineSyncState {
  // Current status
  status: SyncStatus
  isOnline: boolean

  // Pending counts
  pendingSurveys: number
  pendingPhotos: number
  failedPhotos: number

  // Storage info
  storageUsed: number
  storageQuota: number
  storagePercentUsed: number

  // Last sync info
  lastSyncAt: string | null
  lastSyncError: string | null

  // Actions
  syncNow: () => Promise<boolean>
  retryFailed: () => void
}

/**
 * Hook for managing offline sync state and operations
 *
 * Provides:
 * - Real-time sync status
 * - Pending item counts
 * - Storage usage info
 * - Manual sync triggers
 */
export function useOfflineSync(): OfflineSyncState {
  // Online status
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  // Sync status
  const [status, setStatus] = useState<SyncStatus>('synced')
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)

  // Pending counts
  const [pendingSurveys, setPendingSurveys] = useState(0)
  const [pendingPhotos, setPendingPhotos] = useState(0)
  const [failedPhotos, setFailedPhotos] = useState(0)

  // Storage info
  const [storageInfo, setStorageInfo] = useState({
    storageUsed: 0,
    storageQuota: 0,
    storagePercentUsed: 0,
  })

  // Survey store
  const saveDraft = useSurveyStore((state) => state.saveDraft)
  const isDirty = useSurveyStore((state) => state.isDirty)
  const isSyncing = useSurveyStore((state) => state.isSyncing)
  const syncError = useSurveyStore((state) => state.syncError)

  // Photo queue store
  const { retryFailed: retryFailedPhotos, getPendingCount, getFailedCount } =
    usePhotoQueueStore()

  // Sync interval ref
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Trigger sync function (memoized to avoid effect re-runs)
  const triggerSync = useCallback(async () => {
    if (!isOnline) return

    // Process photo queue
    processPhotoQueue()

    // Sync survey data if dirty
    if (isDirty) {
      await saveDraft()
    }

    setLastSyncAt(new Date().toISOString())
  }, [isOnline, isDirty, saveDraft])

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Trigger sync when coming online
      triggerSync()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [triggerSync])

  // Update counts periodically
  useEffect(() => {
    const updateCounts = async () => {
      try {
        // Get IndexedDB counts
        if (isOfflineStorageAvailable()) {
          const surveys = await getPendingSurveys()
          setPendingSurveys(surveys.length)

          const photos = await getPendingPhotos()
          setPendingPhotos(photos.length)
        }

        // Get localStorage queue counts
        const pending = getPendingCount()
        const failed = getFailedCount()
        setPendingPhotos((prev) => prev + pending)
        setFailedPhotos(failed)

        // Get storage estimate
        const estimate = await getStorageEstimate()
        setStorageInfo({
          storageUsed: estimate.usage,
          storageQuota: estimate.quota,
          storagePercentUsed: estimate.percentUsed,
        })
      } catch (error) {
        logger.error(
          { error: formatError(error, 'OFFLINE_COUNTS_UPDATE_ERROR') },
          'Error updating offline counts'
        )
      }
    }

    updateCounts()

    // Update every 5 seconds
    const interval = setInterval(updateCounts, 5000)
    return () => clearInterval(interval)
  }, [getPendingCount, getFailedCount])

  // Update status based on state
  useEffect(() => {
    if (!isOnline) {
      setStatus('offline')
    } else if (isSyncing) {
      setStatus('syncing')
    } else if (syncError) {
      setStatus('error')
      setLastSyncError(syncError)
    } else if (isDirty || pendingSurveys > 0 || pendingPhotos > 0) {
      setStatus('pending')
    } else {
      setStatus('synced')
    }
  }, [isOnline, isSyncing, syncError, isDirty, pendingSurveys, pendingPhotos])

  // Manual sync action
  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!isOnline) {
      return false
    }

    setStatus('syncing')
    setLastSyncError(null)

    try {
      // Process photo queue
      processPhotoQueue()

      // Save survey draft
      const success = await saveDraft()

      if (success) {
        setLastSyncAt(new Date().toISOString())
        setStatus('synced')
        return true
      } else {
        setStatus('error')
        return false
      }
    } catch (error) {
      logger.error(
        { error: formatError(error, 'SYNC_ERROR') },
        'Sync error'
      )
      setLastSyncError(
        error instanceof Error ? error.message : 'Sync failed'
      )
      setStatus('error')
      return false
    }
  }, [isOnline, saveDraft])

  // Retry failed items
  const retryFailed = useCallback(() => {
    retryFailedPhotos()
    if (isOnline) {
      processPhotoQueue()
    }
  }, [retryFailedPhotos, isOnline])

  // Set up periodic sync when online
  useEffect(() => {
    if (isOnline) {
      // Sync every 30 seconds when online
      syncIntervalRef.current = setInterval(triggerSync, 30000)

      // Initial sync
      triggerSync()
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [isOnline, triggerSync])

  return {
    status,
    isOnline,
    pendingSurveys,
    pendingPhotos,
    failedPhotos,
    ...storageInfo,
    lastSyncAt,
    lastSyncError,
    syncNow,
    retryFailed,
  }
}

/**
 * Simpler hook just for sync status indicator
 */
export function useSyncStatus(): {
  status: SyncStatus
  label: string
  color: string
} {
  const { status } = useOfflineSync()

  const labels: Record<SyncStatus, string> = {
    synced: 'Synced',
    syncing: 'Syncing...',
    pending: 'Changes pending',
    offline: 'Offline',
    error: 'Sync error',
  }

  const colors: Record<SyncStatus, string> = {
    synced: 'text-green-600',
    syncing: 'text-blue-600',
    pending: 'text-yellow-600',
    offline: 'text-gray-500',
    error: 'text-red-600',
  }

  return {
    status,
    label: labels[status],
    color: colors[status],
  }
}
