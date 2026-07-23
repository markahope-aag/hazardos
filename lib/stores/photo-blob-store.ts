'use client'

/**
 * Durable, offline-safe storage for captured photo bytes, keyed by the upload
 * queue's photo id.
 *
 * Why this exists: a photo captured in the field held its bytes only in a JS
 * `blob:`/`data:` URL in memory. The upload queue deliberately does NOT persist
 * those bytes to localStorage — base64 at a few photos blows the 5–10 MB quota
 * and corrupts the whole queue (see photo-queue-store partialize). So on any
 * reload — and iOS backgrounds the tab the moment the camera opens — every
 * un-uploaded photo was lost, while its metadata row survived and the review
 * screen rendered blanks. Site photos are the billable, legally-retained
 * deliverable and cannot be re-shot after leaving.
 *
 * IndexedDB stores Blobs natively (no base64 inflation) with a gigabyte-scale
 * quota, so the bytes survive a reload and the queue can finish uploading them
 * when signal returns.
 *
 * Every operation degrades gracefully: with no IndexedDB (SSR, private mode,
 * an old browser) put/delete become no-ops and get returns null, so callers
 * fall back to the in-memory `localUri` exactly as before — no regression, just
 * no cross-reload durability on those platforms.
 */

const DB_NAME = 'hazardos-photo-blobs'
const STORE = 'blobs'
const VERSION = 1

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

/** Persist a photo's bytes. No-op when IndexedDB is unavailable. */
export async function putPhotoBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(blob, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve() // best-effort: a failed persist just loses durability
      tx.onabort = () => resolve()
    } catch {
      resolve()
    }
  })
}

/** Retrieve a photo's bytes, or null if absent / IndexedDB unavailable. */
export async function getPhotoBlob(id: string): Promise<Blob | null> {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(id)
      req.onsuccess = () => resolve((req.result as Blob) ?? null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

/** Drop a photo's bytes once it has uploaded or been discarded. */
export async function deletePhotoBlob(id: string): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    } catch {
      resolve()
    }
  })
}
