'use client'

/**
 * Offline Storage Service
 *
 * Provides IndexedDB-based storage for offline survey data and photo blobs.
 * This is used in addition to localStorage for larger data like photos.
 */

import { createServiceLogger, formatError } from '@/lib/utils/logger';

const log = createServiceLogger('OfflineStorageService');
const DB_NAME = 'hazardos-surveys'
const DB_VERSION = 1

// Store names
const STORES = {
  SURVEYS: 'surveys',
  PHOTOS: 'photos',
  SYNC_QUEUE: 'sync-queue',
} as const

// Types
export interface OfflineSurvey {
  id: string
  organizationId: string
  customerId?: string
  formData: Record<string, unknown>
  currentSection: string
  lastModified: string
  syncStatus: 'pending' | 'synced' | 'error'
  syncError?: string
}

export interface OfflinePhoto {
  id: string
  surveyId: string
  blob: Blob
  dataUrl?: string // For quick preview
  category: string
  location: string
  caption: string
  gpsCoordinates?: {
    latitude: number
    longitude: number
  } | null
  timestamp: string
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error'
  remoteUrl?: string
  error?: string
}

export interface SyncQueueItem {
  id: string
  type: 'survey' | 'photo'
  action: 'create' | 'update' | 'delete'
  resourceId: string
  data: Record<string, unknown>
  createdAt: string
  retryCount: number
  lastError?: string
}

// Database connection singleton
let db: IDBDatabase | null = null

/**
 * Initialize the IndexedDB database
 */
export async function initOfflineStorage(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      log.error(
        { error: request.error },
        'Failed to open IndexedDB'
      )
      reject(new Error('Failed to open offline storage'))
    }

    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Create surveys store
      if (!database.objectStoreNames.contains(STORES.SURVEYS)) {
        const surveyStore = database.createObjectStore(STORES.SURVEYS, {
          keyPath: 'id',
        })
        surveyStore.createIndex('organizationId', 'organizationId', {
          unique: false,
        })
        surveyStore.createIndex('syncStatus', 'syncStatus', { unique: false })
        surveyStore.createIndex('lastModified', 'lastModified', {
          unique: false,
        })
      }

      // Create photos store
      if (!database.objectStoreNames.contains(STORES.PHOTOS)) {
        const photoStore = database.createObjectStore(STORES.PHOTOS, {
          keyPath: 'id',
        })
        photoStore.createIndex('surveyId', 'surveyId', { unique: false })
        photoStore.createIndex('uploadStatus', 'uploadStatus', {
          unique: false,
        })
      }

      // Create sync queue store
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = database.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'id',
        })
        queueStore.createIndex('type', 'type', { unique: false })
        queueStore.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
}

/**
 * Get database connection (initializes if needed)
 */
async function getDb(): Promise<IDBDatabase> {
  if (!db) {
    return initOfflineStorage()
  }
  return db
}

// ==================== Survey Operations ====================

/**
 * Save a survey to offline storage
 */
export async function saveOfflineSurvey(survey: OfflineSurvey): Promise<void> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SURVEYS], 'readwrite')
    const store = transaction.objectStore(STORES.SURVEYS)

    const request = store.put({
      ...survey,
      lastModified: new Date().toISOString(),
    })

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Get a survey from offline storage
 */
export async function getOfflineSurvey(
  id: string
): Promise<OfflineSurvey | null> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SURVEYS], 'readonly')
    const store = transaction.objectStore(STORES.SURVEYS)

    const request = store.get(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)
  })
}

/**
 * Get all surveys for an organization
 */
export async function getOfflineSurveys(
  organizationId: string
): Promise<OfflineSurvey[]> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SURVEYS], 'readonly')
    const store = transaction.objectStore(STORES.SURVEYS)
    const index = store.index('organizationId')

    const request = index.getAll(organizationId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
  })
}

/**
 * Get surveys pending sync
 */
export async function getPendingSurveys(): Promise<OfflineSurvey[]> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SURVEYS], 'readonly')
    const store = transaction.objectStore(STORES.SURVEYS)
    const index = store.index('syncStatus')

    const request = index.getAll('pending')

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
  })
}

/**
 * Delete a survey from offline storage
 */
export async function deleteOfflineSurvey(id: string): Promise<void> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SURVEYS], 'readwrite')
    const store = transaction.objectStore(STORES.SURVEYS)

    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// ==================== Photo Operations ====================

/**
 * Save a photo to offline storage
 */
export async function saveOfflinePhoto(photo: OfflinePhoto): Promise<void> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PHOTOS], 'readwrite')
    const store = transaction.objectStore(STORES.PHOTOS)

    const request = store.put(photo)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Get a photo from offline storage
 */
export async function getOfflinePhoto(id: string): Promise<OfflinePhoto | null> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PHOTOS], 'readonly')
    const store = transaction.objectStore(STORES.PHOTOS)

    const request = store.get(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)
  })
}

/**
 * Get all photos for a survey
 */
export async function getOfflinePhotos(surveyId: string): Promise<OfflinePhoto[]> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PHOTOS], 'readonly')
    const store = transaction.objectStore(STORES.PHOTOS)
    const index = store.index('surveyId')

    const request = index.getAll(surveyId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
  })
}

/**
 * Get photos pending upload
 */
export async function getPendingPhotos(): Promise<OfflinePhoto[]> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PHOTOS], 'readonly')
    const store = transaction.objectStore(STORES.PHOTOS)
    const index = store.index('uploadStatus')

    const request = index.getAll('pending')

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
  })
}

/**
 * Update photo upload status
 */
export async function updatePhotoStatus(
  id: string,
  status: OfflinePhoto['uploadStatus'],
  remoteUrl?: string,
  error?: string
): Promise<void> {
  const photo = await getOfflinePhoto(id)
  if (!photo) return

  await saveOfflinePhoto({
    ...photo,
    uploadStatus: status,
    remoteUrl: remoteUrl || photo.remoteUrl,
    error: error || photo.error,
  })
}

/**
 * Delete a photo from offline storage
 */
export async function deleteOfflinePhoto(id: string): Promise<void> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PHOTOS], 'readwrite')
    const store = transaction.objectStore(STORES.PHOTOS)

    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Delete all photos for a survey
 */
export async function deleteOfflinePhotosForSurvey(
  surveyId: string
): Promise<void> {
  const photos = await getOfflinePhotos(surveyId)

  for (const photo of photos) {
    await deleteOfflinePhoto(photo.id)
  }
}

// ==================== Sync Queue Operations ====================

/**
 * Add an item to the sync queue
 */
export async function addToSyncQueue(
  item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>
): Promise<string> {
  const database = await getDb()

  const id = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const queueItem: SyncQueueItem = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SYNC_QUEUE], 'readwrite')
    const store = transaction.objectStore(STORES.SYNC_QUEUE)

    const request = store.put(queueItem)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(id)
  })
}

/**
 * Get all items in the sync queue
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SYNC_QUEUE], 'readonly')
    const store = transaction.objectStore(STORES.SYNC_QUEUE)
    const index = store.index('createdAt')

    const request = index.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
  })
}

/**
 * Update a sync queue item (e.g., increment retry count)
 */
export async function updateSyncQueueItem(
  id: string,
  updates: Partial<SyncQueueItem>
): Promise<void> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SYNC_QUEUE], 'readwrite')
    const store = transaction.objectStore(STORES.SYNC_QUEUE)

    const getRequest = store.get(id)

    getRequest.onerror = () => reject(getRequest.error)
    getRequest.onsuccess = () => {
      const item = getRequest.result
      if (!item) {
        resolve()
        return
      }

      const putRequest = store.put({ ...item, ...updates })
      putRequest.onerror = () => reject(putRequest.error)
      putRequest.onsuccess = () => resolve()
    }
  })
}

/**
 * Remove an item from the sync queue
 */
export async function removeFromSyncQueue(id: string): Promise<void> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SYNC_QUEUE], 'readwrite')
    const store = transaction.objectStore(STORES.SYNC_QUEUE)

    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Clear all synced items from the sync queue
 */
export async function clearSyncedItems(): Promise<void> {
  const queue = await getSyncQueue()

  // In a real app, you'd filter by status, but since we remove immediately
  // after success, this just clears everything
  for (const item of queue) {
    await removeFromSyncQueue(item.id)
  }
}

// ==================== Utility Functions ====================

/**
 * Get storage usage estimates
 */
export async function getStorageEstimate(): Promise<{
  usage: number
  quota: number
  percentUsed: number
}> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentUsed: estimate.quota
        ? Math.round(((estimate.usage || 0) / estimate.quota) * 100)
        : 0,
    }
  }

  return { usage: 0, quota: 0, percentUsed: 0 }
}

/**
 * Clear all offline data
 */
export async function clearAllOfflineData(): Promise<void> {
  const database = await getDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [STORES.SURVEYS, STORES.PHOTOS, STORES.SYNC_QUEUE],
      'readwrite'
    )

    transaction.onerror = () => reject(transaction.error)
    transaction.oncomplete = () => resolve()

    transaction.objectStore(STORES.SURVEYS).clear()
    transaction.objectStore(STORES.PHOTOS).clear()
    transaction.objectStore(STORES.SYNC_QUEUE).clear()
  })
}

/**
 * Check if IndexedDB is available
 */
export function isOfflineStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}
