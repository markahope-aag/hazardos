import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Regression coverage for the photo-queue memory release (EX5: "try a survey
 * with 100 photos"). Each captured photo holds a ~2-3MB base64 payload in
 * TWO places — the upload queue's `localUri` and survey-store's
 * `dataUrl`/`blob`. Retaining those for the whole session pins hundreds of MB
 * across a 100-photo survey and OOMs mobile browsers. Once a photo's bytes are
 * safely in R2 nothing reads the local copies again, so a successful upload
 * must drop them from memory:
 *   - the queue entry's `localUri` is cleared to ''
 *   - the survey-store entry's `dataUrl`/`blob` are nulled (and it flips to
 *     the uploaded `path` for rendering)
 */

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } } }),
    },
  }),
}))

vi.mock('@/lib/utils/logger', () => ({
  createServiceLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  formatError: (e: unknown) => String(e),
}))

import { usePhotoQueueStore } from '@/lib/stores/photo-queue-store'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { processPhotoQueue } from '@/lib/services/photo-upload-service'

// A tiny valid 1x1 base64 payload so blobFromLocalUri succeeds without fetch.
const DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='

describe('photo upload memory release', () => {
  beforeEach(() => {
    usePhotoQueueStore.setState({ queue: [], isProcessing: false })
    useSurveyStore.setState((s) => ({
      formData: { ...s.formData, photos: { photos: [] } },
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clears localUri on the queue entry when a photo reaches "uploaded" (pure reducer)', () => {
    const store = usePhotoQueueStore.getState()
    const id = store.addPhoto({
      surveyId: 'survey-1', organizationId: 'org-1', localUri: DATA_URL,
      category: 'general', location: '', caption: '', gpsCoordinates: null,
      fileSize: 123, fileType: 'image/jpeg', mediaType: 'image',
    })
    // Uploading keeps the payload (still needed to PUT); uploaded drops it.
    store.updatePhotoStatus(id, 'uploading')
    expect(usePhotoQueueStore.getState().queue[0].localUri).toBe(DATA_URL)
    store.updatePhotoStatus(id, 'uploaded', 'https://r2/display.jpg', null)
    const entry = usePhotoQueueStore.getState().queue[0]
    expect(entry.status).toBe('uploaded')
    expect(entry.localUri).toBe('')
    expect(entry.remoteUrl).toBe('https://r2/display.jpg')
  })

  it('nulls survey-store dataUrl/blob and sets path after a successful upload', async () => {
    // Survey-store photo id must match the queue photo id so the service's
    // updatePhoto mirror lands on it. Add to survey store first, capture its id.
    const surveyId = useSurveyStore.getState().addPhoto({
      blob: new Blob(['x'], { type: 'image/jpeg' }),
      dataUrl: DATA_URL,
      path: null,
      timestamp: null,
      gpsCoordinates: null,
      category: 'general',
      area_id: null,
      location: '',
      caption: '',
      mediaType: 'image',
      mimeType: 'image/jpeg',
      fileSize: 123,
    })

    // Queue entry with the SAME id so uploadPhotoToStorage mirrors onto it.
    usePhotoQueueStore.setState({
      queue: [{
        id: surveyId, surveyId: 'survey-1', organizationId: 'org-1', localUri: DATA_URL,
        category: 'general', location: '', caption: '', gpsCoordinates: null,
        status: 'pending', remoteUrl: null, error: null, retryCount: 0,
        createdAt: new Date('2026-07-14').toISOString(), fileSize: 123, fileType: 'image/jpeg',
        mediaType: 'image',
      }],
      isProcessing: false,
    })

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/photos/upload-url')) {
        return { ok: true, json: async () => ({ uploadUrl: 'https://r2/put', key: 'orig-key' }) } as Response
      }
      if (String(url) === 'https://r2/put') {
        return { ok: true, text: async () => '' } as Response
      }
      if (String(url).includes('/photos/finalize')) {
        return {
          ok: true,
          json: async () => ({
            photo: {
              id: surveyId, original_r2_key: 'orig-key', stamped_r2_key: 'stamped-key',
              file_hash: 'h', captured_at: null, captured_at_source: null,
              captured_lat: null, captured_lng: null, device_make: null, device_model: null,
              stamp_status: 'stamped', stamp_error: null,
            },
            signedDisplayUrl: 'https://r2/display.jpg',
          }),
        } as Response
      }
      throw new Error(`unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    await processPhotoQueue()

    const queued = usePhotoQueueStore.getState().queue[0]
    expect(queued.status).toBe('uploaded')
    expect(queued.localUri).toBe('')

    const surveyPhoto = useSurveyStore.getState().formData.photos.photos[0]
    expect(surveyPhoto.dataUrl).toBeNull()
    expect(surveyPhoto.blob).toBeNull()
    expect(surveyPhoto.path).toBe('r2:stamped-key')
    expect(surveyPhoto.stamped_path).toBe('r2:stamped-key')
  })
})
