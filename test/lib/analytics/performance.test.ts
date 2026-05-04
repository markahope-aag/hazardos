import { describe, it, expect, vi, beforeEach } from 'vitest'
import { track } from '@/lib/analytics/track'

vi.mock('@/lib/analytics/track', () => ({
  track: vi.fn(),
}))

import {
  trackApiPerformance,
  trackDatabaseQuery,
  trackPerformanceMetric,
  markPerformance,
  measurePerformance,
  createPerformanceTimer,
  withPerformanceTracking,
  trackRenderTime,
  trackNetworkTiming,
} from '@/lib/analytics/performance'

describe('analytics performance', () => {
  beforeEach(() => {
    vi.mocked(track).mockClear()
  })

  it('trackApiPerformance sends rounded payload and slow_api when over threshold', () => {
    trackApiPerformance({
      endpoint: '/api/x',
      method: 'GET',
      statusCode: 200,
      duration: 3000.4,
      success: true,
    })
    expect(track).toHaveBeenCalledWith('api_performance', {
      endpoint: '/api/x',
      method: 'GET',
      status_code: 200,
      duration_ms: 3000,
      success: true,
      error_message: null,
    })
    expect(track).not.toHaveBeenCalledWith(
      'slow_api',
      expect.anything()
    )

    vi.mocked(track).mockClear()
    trackApiPerformance({
      endpoint: '/api/y',
      method: 'POST',
      statusCode: 500,
      duration: 3001,
      success: false,
      errorMessage: 'x'.repeat(250),
    })
    expect(track).toHaveBeenCalledWith('slow_api', {
      endpoint: '/api/y',
      method: 'POST',
      duration_ms: 3001,
    })
    expect(track).toHaveBeenCalledWith(
      'api_performance',
      expect.objectContaining({
        error_message: 'x'.repeat(200),
      })
    )
  })

  it('trackDatabaseQuery sends slow_query when duration over 1000ms', () => {
    trackDatabaseQuery({
      operation: 'select',
      table: 'jobs',
      duration: 999,
      success: true,
    })
    expect(track).toHaveBeenCalledTimes(1)

    vi.mocked(track).mockClear()
    trackDatabaseQuery({
      operation: 'update',
      table: 'jobs',
      duration: 1001,
      rowCount: 3,
      success: true,
    })
    expect(track).toHaveBeenCalledWith('slow_query', {
      operation: 'update',
      table: 'jobs',
      duration_ms: 1001,
    })
  })

  it('trackPerformanceMetric forwards metric and metadata', () => {
    trackPerformanceMetric({
      name: 'custom',
      value: 42,
      unit: 'ms',
      category: 'api',
      metadata: { foo: 'bar' },
    })
    expect(track).toHaveBeenCalledWith(
      'performance_metric',
      expect.objectContaining({
        metric_name: 'custom',
        value: 42,
        unit: 'ms',
        category: 'api',
        foo: 'bar',
      })
    )
  })

  it('markPerformance then measurePerformance tracks duration and clears mark', () => {
    const mark = `t-${Math.random()}`
    markPerformance(mark)
    const duration = measurePerformance(mark, 'database')
    expect(duration).not.toBeNull()
    expect(track).toHaveBeenCalledWith(
      'performance_metric',
      expect.objectContaining({
        metric_name: mark,
        unit: 'ms',
        category: 'database',
      })
    )
    expect(measurePerformance(mark, 'custom')).toBeNull()
  })

  it('createPerformanceTimer end records success metadata', () => {
    const timer = createPerformanceTimer('op')
    const ms = timer.end(true)
    expect(ms).toBeGreaterThanOrEqual(0)
    expect(track).toHaveBeenCalledWith(
      'performance_metric',
      expect.objectContaining({
        metric_name: 'op',
        metadata: { success: true },
      })
    )
    timer.cancel()
  })

  it('withPerformanceTracking resolves and records success', async () => {
    const fn = vi.fn(async (n: number) => n + 1)
    const wrapped = withPerformanceTracking(fn, 'add-one')
    await expect(wrapped(1)).resolves.toBe(2)
    expect(fn).toHaveBeenCalledWith(1)
    expect(track).toHaveBeenCalledWith(
      'performance_metric',
      expect.objectContaining({
        metadata: { success: true },
      })
    )
  })

  it('withPerformanceTracking propagates errors and records failure', async () => {
    const err = new Error('boom')
    const wrapped = withPerformanceTracking(
      vi.fn(async () => {
        throw err
      }),
      'fails'
    )
    await expect(wrapped()).rejects.toThrow('boom')
    expect(track).toHaveBeenCalledWith(
      'performance_metric',
      expect.objectContaining({
        metadata: { success: false },
      })
    )
  })

  it('trackRenderTime always records metric and adds slow_render over 100ms', () => {
    vi.mocked(track).mockClear()
    trackRenderTime('Card', 50)
    expect(track).toHaveBeenCalledWith(
      'performance_metric',
      expect.objectContaining({
        metric_name: 'render_Card',
        value: 50,
        category: 'render',
      })
    )
    expect(track).not.toHaveBeenCalledWith(
      'slow_render',
      expect.anything()
    )

    vi.mocked(track).mockClear()
    trackRenderTime('Heavy', 100.1)
    expect(track).toHaveBeenCalledWith('slow_render', {
      component: 'Heavy',
      duration_ms: 100,
    })
  })

  it('trackNetworkTiming parses pathname from absolute and relative URLs', () => {
    trackNetworkTiming('https://example.com/foo/bar?x=1', 'GET', 12, 100)
    expect(track).toHaveBeenCalledWith(
      'network_timing',
      expect.objectContaining({
        path: '/foo/bar',
        method: 'GET',
        duration_ms: 12,
        size_bytes: 100,
      })
    )

    vi.mocked(track).mockClear()
    trackNetworkTiming('/relative', 'POST', 5)
    expect(track).toHaveBeenCalledWith(
      'network_timing',
      expect.objectContaining({
        path: '/relative',
        size_bytes: null,
      })
    )
  })
})
