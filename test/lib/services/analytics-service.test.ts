import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnalyticsService } from '@/lib/services/analytics-service'
import type { TrackingEvent, PerformanceMetric, ErrorEvent } from '@/lib/analytics/types'

// Mock external dependencies
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  gte: vi.fn(() => mockSupabase),
  lte: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  single: vi.fn(),
}

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/lib/services/logging-service', () => ({
  LoggingService: mockLogger,
}))

// Mock environment
const originalEnv = process.env
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    NEXT_PUBLIC_ANALYTICS_ENABLED: 'true',
  }
  vi.clearAllMocks()
})

afterEach(() => {
  process.env = originalEnv
})

describe('AnalyticsService', () => {
  describe('Event Tracking', () => {
    it('tracks custom events successfully', async () => {
      mockSupabase.single.mockResolvedValue({ data: { id: '1' }, error: null })

      const event: TrackingEvent = {
        name: 'button_click',
        category: 'user_interaction',
        properties: {
          button_id: 'submit-form',
          page: '/dashboard',
        },
        user_id: 'user-123',
        session_id: 'session-456',
        timestamp: new Date(),
      }

      const result = await AnalyticsService.track(event)

      expect(result).toEqual({ success: true, event_id: '1' })
      expect(mockSupabase.from).toHaveBeenCalledWith('analytics_events')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'button_click',
          category: 'user_interaction',
          properties: event.properties,
          user_id: 'user-123',
          session_id: 'session-456',
        })
      )
    })

    it('handles tracking errors gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const event: TrackingEvent = {
        name: 'test_event',
        category: 'test',
        user_id: 'user-123',
        timestamp: new Date(),
      }

      const result = await AnalyticsService.track(event)

      expect(result).toEqual({ success: false, error: 'Database error' })
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to track analytics event',
        expect.any(Object)
      )
    })

    it('validates event data before tracking', async () => {
      const invalidEvent = {
        // Missing required fields
        category: 'test',
      } as TrackingEvent

      const result = await AnalyticsService.track(invalidEvent)

      expect(result.success).toBe(false)
      expect(result.error).toContain('validation')
      expect(mockSupabase.insert).not.toHaveBeenCalled()
    })

    it('sanitizes sensitive data in event properties', async () => {
      mockSupabase.single.mockResolvedValue({ data: { id: '1' }, error: null })

      const event: TrackingEvent = {
        name: 'form_submit',
        category: 'user_interaction',
        properties: {
          email: 'user@example.com',
          password: 'secret123',
          credit_card: '4111-1111-1111-1111',
          form_id: 'contact-form',
        },
        user_id: 'user-123',
        timestamp: new Date(),
      }

      await AnalyticsService.track(event)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            email: '[REDACTED]',
            password: '[REDACTED]',
            credit_card: '[REDACTED]',
            form_id: 'contact-form', // Non-sensitive data preserved
          }),
        })
      )
    })

    it('batches multiple events efficiently', async () => {
      mockSupabase.single.mockResolvedValue({ data: [{ id: '1' }, { id: '2' }], error: null })

      const events: TrackingEvent[] = [
        {
          name: 'page_view',
          category: 'navigation',
          user_id: 'user-123',
          timestamp: new Date(),
        },
        {
          name: 'button_click',
          category: 'user_interaction',
          user_id: 'user-123',
          timestamp: new Date(),
        },
      ]

      const result = await AnalyticsService.trackBatch(events)

      expect(result.success).toBe(true)
      expect(result.events_tracked).toBe(2)
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'page_view' }),
          expect.objectContaining({ name: 'button_click' }),
        ])
      )
    })

    it('handles partial batch failures', async () => {
      mockSupabase.single.mockResolvedValue({
        data: [{ id: '1' }],
        error: { message: 'Partial failure', details: 'One event failed validation' },
      })

      const events: TrackingEvent[] = [
        {
          name: 'valid_event',
          category: 'test',
          user_id: 'user-123',
          timestamp: new Date(),
        },
        {
          name: '', // Invalid event
          category: 'test',
          user_id: 'user-123',
          timestamp: new Date(),
        },
      ]

      const result = await AnalyticsService.trackBatch(events)

      expect(result.success).toBe(false)
      expect(result.events_tracked).toBe(1)
      expect(result.failed_events).toBe(1)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Partial batch tracking failure',
        expect.any(Object)
      )
    })
  })

  describe('Performance Tracking', () => {
    it('tracks performance metrics', async () => {
      mockSupabase.single.mockResolvedValue({ data: { id: '1' }, error: null })

      const metric: PerformanceMetric = {
        name: 'page_load_time',
        value: 1250,
        unit: 'ms',
        context: {
          page: '/dashboard',
          user_agent: 'Chrome/91.0',
          connection_type: '4g',
        },
        timestamp: new Date(),
      }

      const result = await AnalyticsService.trackPerformance(metric)

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('performance_metrics')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'page_load_time',
          value: 1250,
          unit: 'ms',
          context: metric.context,
        })
      )
    })

    it('aggregates performance data over time periods', async () => {
      const mockMetrics = [
        { name: 'page_load_time', value: 1200, timestamp: '2024-01-01T10:00:00Z' },
        { name: 'page_load_time', value: 1400, timestamp: '2024-01-01T11:00:00Z' },
        { name: 'page_load_time', value: 1100, timestamp: '2024-01-01T12:00:00Z' },
      ]

      mockSupabase.single.mockResolvedValue({ data: mockMetrics, error: null })

      const result = await AnalyticsService.getPerformanceAggregates({
        metric_name: 'page_load_time',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-02'),
        aggregation: 'hourly',
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        average: 1233.33,
        min: 1100,
        max: 1400,
        count: 3,
        percentiles: {
          p50: 1200,
          p90: 1400,
          p95: 1400,
          p99: 1400,
        },
      })
    })

    it('tracks Core Web Vitals', async () => {
      mockSupabase.single.mockResolvedValue({ data: { id: '1' }, error: null })

      const webVitals = {
        lcp: 2.1,
        fid: 85,
        cls: 0.15,
        fcp: 1.8,
        ttfb: 200,
      }

      const result = await AnalyticsService.trackWebVitals(webVitals, {
        page: '/dashboard',
        user_id: 'user-123',
      })

      expect(result.success).toBe(true)
      expect(mockSupabase.insert).toHaveBeenCalledTimes(5) // One for each metric

      // Verify each metric was tracked
      Object.entries(webVitals).forEach(([metric, value]) => {
        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            name: metric.toUpperCase(),
            value,
            unit: expect.any(String),
          })
        )
      })
    })
  })

  describe('Error Tracking', () => {
    it('tracks application errors', async () => {
      mockSupabase.single.mockResolvedValue({ data: { id: '1' }, error: null })

      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at test.js:1:1'

      const errorEvent: ErrorEvent = {
        name: 'javascript_error',
        message: 'Test error',
        stack: error.stack,
        context: {
          page: '/dashboard',
          user_id: 'user-123',
          component: 'DashboardWidget',
        },
        severity: 'error',
        timestamp: new Date(),
      }

      const result = await AnalyticsService.trackError(errorEvent)

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('error_events')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'javascript_error',
          message: 'Test error',
          stack: error.stack,
          severity: 'error',
        })
      )
    })

    it('groups similar errors together', async () => {
      const mockErrors = [
        { id: '1', message: 'Network error', count: 5 },
        { id: '2', message: 'Validation error', count: 3 },
      ]

      mockSupabase.single.mockResolvedValue({ data: mockErrors, error: null })

      const result = await AnalyticsService.getErrorGroups({
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-02'),
        severity: 'error',
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({
        id: '1',
        message: 'Network error',
        count: 5,
        severity: 'error',
      })
    })

    it('tracks error resolution status', async () => {
      mockSupabase.single.mockResolvedValue({ data: { id: '1' }, error: null })

      const result = await AnalyticsService.updateErrorStatus('error-123', {
        status: 'resolved',
        resolved_by: 'user-456',
        resolution_notes: 'Fixed network timeout issue',
      })

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('error_events')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'error-123')
    })
  })

  describe('Analytics Queries', () => {
    it('retrieves events with filtering and pagination', async () => {
      const mockEvents = [
        { id: '1', name: 'page_view', category: 'navigation' },
        { id: '2', name: 'button_click', category: 'user_interaction' },
      ]

      mockSupabase.single.mockResolvedValue({ data: mockEvents, error: null })

      const result = await AnalyticsService.getEvents({
        category: 'navigation',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-02'),
        limit: 100,
        offset: 0,
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockEvents)
      expect(mockSupabase.eq).toHaveBeenCalledWith('category', 'navigation')
      expect(mockSupabase.gte).toHaveBeenCalledWith('timestamp', expect.any(String))
      expect(mockSupabase.lte).toHaveBeenCalledWith('timestamp', expect.any(String))
    })

    it('generates analytics reports', async () => {
      const mockReportData = {
        total_events: 1000,
        unique_users: 150,
        top_events: [
          { name: 'page_view', count: 500 },
          { name: 'button_click', count: 300 },
        ],
        conversion_rate: 0.15,
      }

      mockSupabase.single.mockResolvedValue({ data: mockReportData, error: null })

      const result = await AnalyticsService.generateReport({
        type: 'user_engagement',
        date_range: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        filters: {
          user_segment: 'premium',
        },
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockReportData)
    })

    it('exports analytics data in different formats', async () => {
      const mockData = [
        { event: 'page_view', count: 100, date: '2024-01-01' },
        { event: 'button_click', count: 50, date: '2024-01-01' },
      ]

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null })

      const result = await AnalyticsService.exportData({
        format: 'csv',
        query: {
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-02'),
        },
      })

      expect(result.success).toBe(true)
      expect(result.data).toContain('event,count,date')
      expect(result.data).toContain('page_view,100,2024-01-01')
      expect(result.format).toBe('csv')
    })
  })

  describe('Configuration and Settings', () => {
    it('respects analytics configuration settings', async () => {
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = 'false'

      const event: TrackingEvent = {
        name: 'test_event',
        category: 'test',
        user_id: 'user-123',
        timestamp: new Date(),
      }

      const result = await AnalyticsService.track(event)

      expect(result).toEqual({
        success: false,
        error: 'Analytics tracking is disabled',
      })
      expect(mockSupabase.insert).not.toHaveBeenCalled()
    })

    it('applies sampling rates correctly', async () => {
      mockSupabase.single.mockResolvedValue({ data: { id: '1' }, error: null })

      // Mock Math.random to control sampling
      const originalRandom = Math.random
      Math.random = vi.fn(() => 0.8) // Above 50% sampling rate

      const event: TrackingEvent = {
        name: 'sampled_event',
        category: 'test',
        user_id: 'user-123',
        timestamp: new Date(),
      }

      const result = await AnalyticsService.track(event, { samplingRate: 0.5 })

      expect(result).toEqual({
        success: false,
        error: 'Event filtered by sampling rate',
      })
      expect(mockSupabase.insert).not.toHaveBeenCalled()

      Math.random = originalRandom
    })

    it('handles rate limiting', async () => {
      // Simulate rate limit exceeded
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded', code: 'RATE_LIMIT' },
      })

      const event: TrackingEvent = {
        name: 'rate_limited_event',
        category: 'test',
        user_id: 'user-123',
        timestamp: new Date(),
      }

      const result = await AnalyticsService.track(event)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Rate limit')
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Analytics rate limit exceeded',
        expect.any(Object)
      )
    })
  })

  describe('Data Privacy and Compliance', () => {
    it('anonymizes user data when required', async () => {
      mockSupabase.single.mockResolvedValue({ data: { id: '1' }, error: null })

      const event: TrackingEvent = {
        name: 'privacy_event',
        category: 'test',
        user_id: 'user-123',
        properties: {
          ip_address: '192.168.1.1',
          user_agent: 'Chrome/91.0',
        },
        timestamp: new Date(),
      }

      await AnalyticsService.track(event, { anonymize: true })

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: expect.stringMatching(/^anon_/), // Anonymized user ID
          properties: expect.objectContaining({
            ip_address: '[ANONYMIZED]',
            user_agent: expect.any(String), // Partial anonymization
          }),
        })
      )
    })

    it('supports data retention policies', async () => {
      mockSupabase.single.mockResolvedValue({ data: { deleted_count: 150 }, error: null })

      const result = await AnalyticsService.cleanupOldData({
        retention_days: 90,
        dry_run: false,
      })

      expect(result.success).toBe(true)
      expect(result.deleted_count).toBe(150)
      expect(mockSupabase.from).toHaveBeenCalledWith('analytics_events')
    })

    it('handles GDPR data deletion requests', async () => {
      mockSupabase.single.mockResolvedValue({ data: { deleted_count: 25 }, error: null })

      const result = await AnalyticsService.deleteUserData('user-123', {
        include_anonymous: true,
        verification_token: 'valid-token',
      })

      expect(result.success).toBe(true)
      expect(result.deleted_count).toBe(25)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User data deletion completed',
        expect.objectContaining({ user_id: 'user-123' })
      )
    })
  })
})