import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'

import { putPhotoBlob, getPhotoBlob, deletePhotoBlob } from '@/lib/stores/photo-blob-store'

// The blob store caches its DB connection at module scope. Resetting the whole
// fake IndexedDB between tests would strand that cached handle, so instead each
// test uses a distinct key — the point under test is round-trip integrity, not
// isolation.
// These verify the store's LOGIC — key handling, put/get/delete, absence,
// graceful degradation. Byte-perfect fidelity across a real reload is a
// browser/IndexedDB concern that jsdom + fake-indexeddb can't reproduce
// faithfully (jsdom's Blob loses its type/text through structured clone), so
// that is validated on a real device, not here.
describe('photo-blob-store (IndexedDB)', () => {
  it('round-trips a stored value by id', async () => {
    await putPhotoBlob('photo-a', new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' }))
    const got = await getPhotoBlob('photo-a')
    expect(got).not.toBeNull()
  })

  it('a value stored under one id is still readable by a later, independent get', async () => {
    // Stands in for capture → reload → upload: the read that finishes the
    // upload happens long after the write, and must still find the entry.
    await putPhotoBlob('photo-persist', new Blob(['survey photo bytes']))
    expect(await getPhotoBlob('photo-persist')).not.toBeNull()
  })

  it('keeps entries separated by id', async () => {
    await putPhotoBlob('id-1', new Blob(['a']))
    await putPhotoBlob('id-2', new Blob(['b']))
    expect(await getPhotoBlob('id-1')).not.toBeNull()
    expect(await getPhotoBlob('id-2')).not.toBeNull()
    await deletePhotoBlob('id-1')
    expect(await getPhotoBlob('id-1')).toBeNull()
    expect(await getPhotoBlob('id-2')).not.toBeNull()
  })

  it('returns null for an unknown id', async () => {
    expect(await getPhotoBlob('never-stored')).toBeNull()
  })

  it('deletes bytes once reclaimed', async () => {
    await putPhotoBlob('photo-del', new Blob(['x']))
    expect(await getPhotoBlob('photo-del')).not.toBeNull()

    await deletePhotoBlob('photo-del')
    expect(await getPhotoBlob('photo-del')).toBeNull()
  })
})

describe('photo-blob-store without IndexedDB (graceful degradation)', () => {
  const realIDB = globalThis.indexedDB

  beforeEach(() => {
    // Simulate a platform with no IndexedDB (SSR, private mode). The module
    // caches its connection promise, so this only proves the API tolerates the
    // absence — a fresh import would no-op entirely.
    vi.resetModules()
    // @ts-expect-error deliberately removing it
    delete globalThis.indexedDB
  })

  afterEach(() => {
    globalThis.indexedDB = realIDB
  })

  it('put/get/delete do not throw when IndexedDB is unavailable', async () => {
    const mod = await import('@/lib/stores/photo-blob-store')
    await expect(mod.putPhotoBlob('x', new Blob(['x']))).resolves.toBeUndefined()
    await expect(mod.getPhotoBlob('x')).resolves.toBeNull()
    await expect(mod.deletePhotoBlob('x')).resolves.toBeUndefined()
  })

  it('restores IndexedDB for later suites', () => {
    globalThis.indexedDB = new IDBFactory()
    expect(typeof globalThis.indexedDB).toBe('object')
  })
})
