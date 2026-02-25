import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus, useOnlineSync, usePhotoUploadStatus } from '@/lib/hooks/use-online-status'

// Mock dependencies
const mockProcessPhotoQueue = vi.fn()
const mockSaveDraft = vi.fn()
const mockGetUploadProgress = vi.fn()

vi.mock('@/lib/services/photo-upload-service', () => ({
  processPhotoQueue: mockProcessPhotoQueue,
  getUploadProgress: mockGetUploadProgress,
}))

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: (selector: any) => {
    const mockState = {
      saveDraft: mockSaveDraft,
      isDirty: false,
      isSyncing: false,
      syncError: null,
    }
    return selector(mockState)
  },
}))

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

// Mock window event listeners
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
})
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
})

describe('useOnlineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigator.onLine = true
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return initial online status', () => {
    navigator.onLine = true
    const { result: _ } = renderHook(() => useOnlineStatus())
    
    expect(result.current).toBe(true)
  })

  it('should return false when navigator is offline', () => {
    navigator.onLine = false
    const { result: _ } = renderHook(() => useOnlineStatus())
    
    expect(result.current).toBe(false)
  })

  it('should add event listeners on mount', () => {
    renderHook(() => useOnlineStatus())
    
    expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should remove event listeners on unmount', () => {
    const { unmount } = renderHook(() => useOnlineStatus())
    
    unmount()
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should process photo queue when coming online', () => {
    const { result: _ } = renderHook(() => useOnlineStatus())
    
    // Get the online handler from the addEventListener call
    const onlineHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'online'
    )?.[1]
    
    expect(onlineHandler).toBeDefined()
    
    act(() => {
      onlineHandler?.()
    })
    
    expect(mockProcessPhotoQueue).toHaveBeenCalledTimes(1)
  })

  it('should handle server-side rendering', () => {
    // Mock navigator as undefined (SSR environment)
    const originalNavigator = global.navigator
    // @ts-expect-error - Testing offline scenario by mocking navigator.onLine
    delete global.navigator
    
    const { result: _ } = renderHook(() => useOnlineStatus())
    
    // Should default to true in SSR
    expect(result.current).toBe(true)
    
    // Restore navigator
    global.navigator = originalNavigator
  })
})

describe('useOnlineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigator.onLine = true
    mockSaveDraft.mockResolvedValue(true)
    mockProcessPhotoQueue.mockResolvedValue(undefined)
  })

  it('should return sync functions and status', () => {
    const { result: _ } = renderHook(() => useOnlineSync())
    
    expect(typeof result.current.syncNow).toBe('function')
    expect(typeof result.current.retrySync).toBe('function')
    expect(typeof result.current.isOnline).toBe('boolean')
    expect(typeof result.current.isDirty).toBe('boolean')
    expect(typeof result.current.isSyncing).toBe('boolean')
  })

  it('should sync when online', async () => {
    navigator.onLine = true
    const { result: _ } = renderHook(() => useOnlineSync())
    
    let syncResult: boolean | undefined
    await act(async () => {
      syncResult = await result.current.syncNow()
    })
    
    expect(mockProcessPhotoQueue).toHaveBeenCalledTimes(1)
    expect(mockSaveDraft).toHaveBeenCalledTimes(1)
    expect(syncResult).toBe(true)
  })

  it('should not sync when offline', async () => {
    navigator.onLine = false
    const { result: _ } = renderHook(() => useOnlineSync())
    
    let syncResult: boolean | undefined
    await act(async () => {
      syncResult = await result.current.syncNow()
    })
    
    expect(mockProcessPhotoQueue).not.toHaveBeenCalled()
    expect(mockSaveDraft).not.toHaveBeenCalled()
    expect(syncResult).toBe(false)
  })

  it('should retry sync when online', async () => {
    navigator.onLine = true
    const { result: _ } = renderHook(() => useOnlineSync())
    
    let retryResult: boolean | undefined
    await act(async () => {
      retryResult = await result.current.retrySync()
    })
    
    expect(mockProcessPhotoQueue).toHaveBeenCalledTimes(1)
    expect(mockSaveDraft).toHaveBeenCalledTimes(1)
    expect(retryResult).toBe(true)
  })

  it('should not retry sync when offline', async () => {
    navigator.onLine = false
    const { result: _ } = renderHook(() => useOnlineSync())
    
    let retryResult: boolean | undefined
    await act(async () => {
      retryResult = await result.current.retrySync()
    })
    
    expect(mockProcessPhotoQueue).not.toHaveBeenCalled()
    expect(mockSaveDraft).not.toHaveBeenCalled()
    expect(retryResult).toBe(false)
  })
})

describe('usePhotoUploadStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockGetUploadProgress.mockReturnValue({
      total: 5,
      uploaded: 3,
      pending: 2,
      failed: 0,
      progress: 60,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial upload status', () => {
    const { result } = renderHook(() => usePhotoUploadStatus('survey-123'))
    
    expect(result.current.total).toBe(0)
    expect(result.current.uploaded).toBe(0)
    expect(result.current.pending).toBe(0)
    expect(result.current.failed).toBe(0)
    expect(result.current.progress).toBe(100)
  })

  it('should not start polling when surveyId is null', () => {
    renderHook(() => usePhotoUploadStatus(null))
    
    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    
    expect(mockGetUploadProgress).not.toHaveBeenCalled()
  })

  it('should update status periodically when surveyId is provided', async () => {
    renderHook(() => usePhotoUploadStatus('survey-123'))

    // Wait for initial update
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    
    // Fast-forward time to trigger interval
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    
    expect(mockGetUploadProgress).toHaveBeenCalledWith('survey-123')
  })

  it('should clean up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    
    const { unmount } = renderHook(() => usePhotoUploadStatus('survey-123'))
    
    unmount()
    
    expect(clearIntervalSpy).toHaveBeenCalled()
    
    clearIntervalSpy.mockRestore()
  })

  it('should update status when surveyId changes', async () => {
    const { rerender } = renderHook(
      ({ surveyId }) => usePhotoUploadStatus(surveyId),
      { initialProps: { surveyId: 'survey-123' } }
    )
    
    // Wait for initial update
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    
    // Change surveyId
    rerender({ surveyId: 'survey-456' })
    
    // Wait for update with new surveyId
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    
    expect(mockGetUploadProgress).toHaveBeenCalledWith('survey-456')
  })

  it('should handle dynamic import correctly', async () => {
    // Mock the dynamic import
    const mockDynamicImport = vi.fn().mockResolvedValue({
      getUploadProgress: mockGetUploadProgress,
    })
    
    // Replace the import function
    vi.doMock('@/lib/services/photo-upload-service', () => mockDynamicImport())
    
    renderHook(() => usePhotoUploadStatus('survey-123'))
    
    // Wait for the dynamic import to resolve
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    
    // The mock should have been called
    expect(mockGetUploadProgress).toHaveBeenCalled()
  })

  it('should handle upload progress updates', async () => {
    mockGetUploadProgress.mockReturnValue({
      total: 10,
      uploaded: 7,
      pending: 2,
      failed: 1,
      progress: 70,
    })
    
    renderHook(() => usePhotoUploadStatus('survey-123'))

    // Wait for status update
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    
    // Fast-forward to trigger interval update
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    
    // Status should be updated (though we can't directly test the state update
    // due to the async nature and mocking, we can verify the function was called)
    expect(mockGetUploadProgress).toHaveBeenCalledWith('survey-123')
  })
})