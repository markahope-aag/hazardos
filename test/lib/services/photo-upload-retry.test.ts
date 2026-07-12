import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Regression coverage for the photo upload queue's retry/backoff logic
 * (SS25: "simulate a failed upload — retries up to 3 times, then surfaces
 * error").
 *
 * processPhotoQueue() captures `const store = usePhotoQueueStore.getState()`
 * once at the top of the function, then in the failure branch reads
 * `store.queue.find((p) => p.id === photo.id)?.retryCount` to decide the
 * backoff delay and whether to give up. That `store.queue` is a snapshot
 * frozen at the moment `getState()` was called — it never reflects the
 * `incrementRetryCount` calls that happen later in the same invocation, so
 * on every failed attempt this reads the SAME stale retryCount (0 for a
 * freshly-queued photo). Effects:
 *   - the backoff delay never escalates (always RETRY_DELAYS_MS[0] = 2000ms
 *     instead of 2s -> 4s -> giving up), contradicting the documented
 *     "2s -> 4s -> 8s" schedule
 *   - the "Photo failed after max retries" error log never fires, since the
 *     stale count never reaches the >= 3 threshold
 *
 * The outer while-loop still terminates correctly (getNextPendingPhoto()
 * reads live state), so this doesn't hang forever — but the backoff and
 * the max-retries error log are broken.
 */

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } } }),
    },
  }),
}))

const logError = vi.hoisted(() => vi.fn())
vi.mock('@/lib/utils/logger', () => ({
  createServiceLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: logError,
  }),
  formatError: (e: unknown) => String(e),
}))

import { usePhotoQueueStore } from '@/lib/stores/photo-queue-store'
import { processPhotoQueue } from '@/lib/services/photo-upload-service'

describe('processPhotoQueue retry/backoff', () => {
  beforeEach(() => {
    usePhotoQueueStore.setState({ queue: [], isProcessing: false })
    logError.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('escalates the backoff delay (2s, then 4s) and logs once max retries is hit', async () => {
    vi.useFakeTimers()
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

    // An invalid data: URL (no comma) makes blobFromLocalUri throw
    // deterministically every attempt, without needing to mock fetch.
    const photoId = usePhotoQueueStore.getState().addPhoto({
      surveyId: 'survey-1',
      organizationId: 'org-1',
      localUri: 'data:bad-no-comma',
      category: 'general',
      location: '',
      caption: '',
      gpsCoordinates: null,
      fileSize: null,
      fileType: 'image/jpeg',
      mediaType: 'image',
    })

    const donePromise = processPhotoQueue()

    // Drain the retry loop's internal delays.
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(9000)
    }
    await donePromise

    const finalPhoto = usePhotoQueueStore.getState().queue.find((p) => p.id === photoId)
    expect(finalPhoto?.status).toBe('failed')
    expect(finalPhoto?.retryCount).toBe(3)

    // The delays actually awaited between attempts should escalate
    // 2000ms -> 4000ms per the documented schedule, not repeat 2000ms.
    const delayArgs = setTimeoutSpy.mock.calls
      .map((call) => call[1])
      .filter((delay): delay is number => delay === 2000 || delay === 4000 || delay === 8000)
    expect(delayArgs).toEqual([2000, 4000])

    // The max-retries error must actually be logged once retries are exhausted.
    expect(logError).toHaveBeenCalledTimes(1)
    expect(logError.mock.calls[0][0]).toMatchObject({ photoId, retryCount: 3 })
  })
})
