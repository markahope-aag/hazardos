import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { 
  useAnalytics, 
  usePageView, 
  useFeatureUsage, 
  useFormAnalytics,
  useWidgetAnalytics,
  useRenderPerformance
} from '@/lib/hooks/use-analytics'

// Mock the analytics module
vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
  trackFormSubmission: vi.fn(),
  trackUserAction: vi.fn(),
  trackFeatureUsage: vi.fn(),
  trackError: vi.fn(),
  trackApiPerformance: vi.fn(),
  markPerformance: vi.fn(),
  measurePerformance: vi.fn().mockReturnValue(100),
}))

// Mock performance.now
const mockPerformanceNow = vi.fn()
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
})

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPerformanceNow.mockReturnValue(1000)
  })

  it('should provide track function', () => {
    const { result } = renderHook(() => useAnalytics())
    
    expect(typeof result.current.track).toBe('function')
    expect(typeof result.current.trackFormSubmission).toBe('function')
    expect(typeof result.current.trackUserAction).toBe('function')
    expect(typeof result.current.trackFeatureUsage).toBe('function')
    expect(typeof result.current.trackError).toBe('function')
    expect(typeof result.current.trackApiPerformance).toBe('function')
    expect(typeof result.current.markPerformance).toBe('function')
    expect(typeof result.current.measurePerformance).toBe('function')
  })

  it('should call track with correct parameters', async () => {
    const { track } = await import('@/lib/analytics')
    const { result } = renderHook(() => useAnalytics())
    
    act(() => {
      result.current.track('test_event', { prop1: 'value1', prop2: 123 })
    })
    
    expect(track).toHaveBeenCalledWith('test_event', { prop1: 'value1', prop2: 123 })
  })

  it('should call trackFormSubmission with correct parameters', async () => {
    const { trackFormSubmission } = await import('@/lib/analytics')
    const { result } = renderHook(() => useAnalytics())
    
    const formEvent = {
      formType: 'customer' as const,
      formName: 'create-customer',
      success: true,
      duration: 1500
    }
    
    act(() => {
      result.current.trackFormSubmission(formEvent)
    })
    
    expect(trackFormSubmission).toHaveBeenCalledWith(formEvent)
  })

  it('should call trackApiPerformance with correct parameters', async () => {
    const { trackApiPerformance } = await import('@/lib/analytics')
    const { result } = renderHook(() => useAnalytics())
    
    act(() => {
      result.current.trackApiPerformance('/api/customers', 'POST', 201, 250, true)
    })
    
    expect(trackApiPerformance).toHaveBeenCalledWith({
      endpoint: '/api/customers',
      method: 'POST',
      statusCode: 201,
      duration: 250,
      success: true,
      errorMessage: undefined
    })
  })
})

describe('usePageView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPerformanceNow.mockReturnValue(1000)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should track page view on mount', async () => {
    const { track } = await import('@/lib/analytics')
    
    renderHook(() => usePageView('test-page', { section: 'dashboard' }))
    
    expect(track).toHaveBeenCalledWith('page_view', {
      page_name: 'test-page',
      section: 'dashboard'
    })
  })

  it('should track page exit on unmount', async () => {
    const { track } = await import('@/lib/analytics')
    mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(3500) // 2500ms duration
    
    const { unmount } = renderHook(() => usePageView('test-page'))
    
    unmount()
    
    expect(track).toHaveBeenCalledWith('page_exit', {
      page_name: 'test-page',
      time_on_page_ms: 2500,
      time_on_page_seconds: 3 // rounded
    })
  })
})

describe('useFeatureUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPerformanceNow.mockReturnValue(1000)
  })

  it('should track feature view on mount by default', async () => {
    const { trackFeatureUsage } = await import('@/lib/analytics')
    
    renderHook(() => useFeatureUsage('site_surveys'))
    
    expect(trackFeatureUsage).toHaveBeenCalledWith({
      feature: 'site_surveys',
      action: 'view'
    })
  })

  it('should not track on mount when trackOnMount is false', async () => {
    const { trackFeatureUsage } = await import('@/lib/analytics')
    
    renderHook(() => useFeatureUsage('site_surveys', { trackOnMount: false }))
    
    expect(trackFeatureUsage).not.toHaveBeenCalled()
  })

  it('should provide trackUse function with duration', async () => {
    const { trackFeatureUsage } = await import('@/lib/analytics')
    mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(2500) // 1500ms duration
    
    const { result } = renderHook(() => useFeatureUsage('site_surveys'))
    
    act(() => {
      result.current.trackUse(true, { survey_type: 'asbestos' })
    })
    
    expect(trackFeatureUsage).toHaveBeenCalledWith({
      feature: 'site_surveys',
      action: 'use',
      success: true,
      duration: 1500,
      metadata: { survey_type: 'asbestos' }
    })
  })

  it('should provide trackConfigure function', async () => {
    const { trackFeatureUsage } = await import('@/lib/analytics')
    
    const { result } = renderHook(() => useFeatureUsage('integrations'))
    
    act(() => {
      result.current.trackConfigure(true, { integration: 'quickbooks' })
    })
    
    expect(trackFeatureUsage).toHaveBeenCalledWith({
      feature: 'integrations',
      action: 'configure',
      success: true,
      metadata: { integration: 'quickbooks' }
    })
  })

  it('should provide trackEnable and trackDisable functions', async () => {
    const { trackFeatureUsage } = await import('@/lib/analytics')
    
    const { result } = renderHook(() => useFeatureUsage('notifications'))
    
    act(() => {
      result.current.trackEnable()
    })
    
    act(() => {
      result.current.trackDisable()
    })
    
    expect(trackFeatureUsage).toHaveBeenCalledWith({
      feature: 'notifications',
      action: 'enable',
      success: true
    })
    
    expect(trackFeatureUsage).toHaveBeenCalledWith({
      feature: 'notifications',
      action: 'disable',
      success: true
    })
  })
})

describe('useFormAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPerformanceNow.mockReturnValue(1000)
  })

  it('should provide form tracking functions', () => {
    const { result } = renderHook(() => useFormAnalytics('customer', 'create-customer-form'))
    
    expect(typeof result.current.startTracking).toBe('function')
    expect(typeof result.current.trackSuccess).toBe('function')
    expect(typeof result.current.trackFailure).toBe('function')
  })

  it('should track form success with duration', async () => {
    const { trackFormSubmission } = await import('@/lib/analytics')
    mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(3000) // 2000ms duration
    
    const { result } = renderHook(() => useFormAnalytics('customer', 'create-customer-form'))
    
    act(() => {
      result.current.startTracking(5)
    })
    
    act(() => {
      result.current.trackSuccess()
    })
    
    expect(trackFormSubmission).toHaveBeenCalledWith({
      formType: 'customer',
      formName: 'create-customer-form',
      success: true,
      duration: 2000,
      fieldCount: 5
    })
  })

  it('should track form failure with error type', async () => {
    const { trackFormSubmission } = await import('@/lib/analytics')
    mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(2500) // 1500ms duration
    
    const { result } = renderHook(() => useFormAnalytics('job', 'create-job-form'))
    
    act(() => {
      result.current.startTracking()
    })
    
    act(() => {
      result.current.trackFailure('validation_error')
    })
    
    expect(trackFormSubmission).toHaveBeenCalledWith({
      formType: 'job',
      formName: 'create-job-form',
      success: false,
      duration: 1500,
      errorType: 'validation_error',
      fieldCount: undefined
    })
  })
})

describe('useWidgetAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should track widget view on mount', async () => {
    const { track } = await import('@/lib/analytics')
    
    renderHook(() => useWidgetAnalytics('revenue-chart'))
    
    expect(track).toHaveBeenCalledWith('widget_interaction', {
      widget_name: 'revenue-chart',
      action: 'view'
    })
  })

  it('should provide widget interaction functions', async () => {
    const { track } = await import('@/lib/analytics')
    
    const { result } = renderHook(() => useWidgetAnalytics('jobs-status-chart'))
    
    act(() => {
      result.current.trackExpand()
    })
    
    act(() => {
      result.current.trackRefresh()
    })
    
    expect(track).toHaveBeenCalledWith('widget_interaction', {
      widget_name: 'jobs-status-chart',
      action: 'expand'
    })
    
    expect(track).toHaveBeenCalledWith('widget_interaction', {
      widget_name: 'jobs-status-chart',
      action: 'refresh'
    })
  })
})

describe('useRenderPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPerformanceNow.mockReturnValue(1000)
  })

  it('should not track on first render', async () => {
    const { track } = await import('@/lib/analytics')
    
    renderHook(() => useRenderPerformance('TestComponent'))
    
    expect(track).not.toHaveBeenCalled()
  })

  it('should track slow renders after first render', async () => {
    const { track } = await import('@/lib/analytics')
    mockPerformanceNow
      .mockReturnValueOnce(1000) // first render
      .mockReturnValueOnce(1020) // second render (20ms duration > 16ms threshold)
    
    const { rerender } = renderHook(() => useRenderPerformance('SlowComponent'))
    
    rerender()
    
    expect(track).toHaveBeenCalledWith('component_render', {
      component: 'SlowComponent',
      render_count: 2,
      duration_ms: 20
    })
  })

  it('should not track fast renders', async () => {
    const { track } = await import('@/lib/analytics')
    mockPerformanceNow
      .mockReturnValueOnce(1000) // first render
      .mockReturnValueOnce(1010) // second render (10ms duration < 16ms threshold)
    
    const { rerender } = renderHook(() => useRenderPerformance('FastComponent'))
    
    rerender()
    
    expect(track).not.toHaveBeenCalled()
  })
})