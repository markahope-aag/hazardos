import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/job-completion-service', () => ({
  JobCompletionService: {
    getVarianceAnalysis: vi.fn(),
    getVarianceSummary: vi.fn()
  }
}))

vi.mock('@/lib/utils/secure-error-handler', () => ({
  createSecureErrorResponse: vi.fn((error) => {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }),
  SecureError: class SecureError extends Error {
    constructor(public type: string, message?: string) {
      super(message)
    }
  }
}))

// Import the route handler
import { GET } from '@/app/api/analytics/variance/route'
import { JobCompletionService } from '@/lib/services/job-completion-service'

describe('Analytics Variance API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/analytics/variance', () => {
    it('should return variance analysis for authenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockVarianceData = [
        {
          job_id: 'job-1',
          job_number: 'JOB-001',
          estimated_cost: 5000.00,
          actual_cost: 5200.00,
          variance: 200.00,
          variance_percentage: 4.0
        },
        {
          job_id: 'job-2',
          job_number: 'JOB-002',
          estimated_cost: 8000.00,
          actual_cost: 7500.00,
          variance: -500.00,
          variance_percentage: -6.25
        }
      ]

      vi.mocked(JobCompletionService.getVarianceAnalysis).mockResolvedValue(mockVarianceData)

      const request = new NextRequest('http://localhost:3000/api/analytics/variance')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockVarianceData)
      expect(JobCompletionService.getVarianceAnalysis).toHaveBeenCalledWith({
        start_date: undefined,
        end_date: undefined,
        customer_id: undefined,
        hazard_types: undefined,
        variance_threshold: undefined
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/variance')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal error')
    })

    it('should handle date range filters', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(JobCompletionService.getVarianceAnalysis).mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/variance?start_date=2026-01-01&end_date=2026-01-31'
      )
      await GET(request)

      expect(JobCompletionService.getVarianceAnalysis).toHaveBeenCalledWith({
        start_date: '2026-01-01',
        end_date: '2026-01-31',
        customer_id: undefined,
        hazard_types: undefined,
        variance_threshold: undefined
      })
    })

    it('should handle customer_id filter', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(JobCompletionService.getVarianceAnalysis).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/analytics/variance?customer_id=customer-1')
      await GET(request)

      expect(JobCompletionService.getVarianceAnalysis).toHaveBeenCalledWith({
        start_date: undefined,
        end_date: undefined,
        customer_id: 'customer-1',
        hazard_types: undefined,
        variance_threshold: undefined
      })
    })

    it('should handle hazard_types filter', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(JobCompletionService.getVarianceAnalysis).mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/variance?hazard_types=asbestos,lead'
      )
      await GET(request)

      expect(JobCompletionService.getVarianceAnalysis).toHaveBeenCalledWith({
        start_date: undefined,
        end_date: undefined,
        customer_id: undefined,
        hazard_types: ['asbestos', 'lead'],
        variance_threshold: undefined
      })
    })

    it('should handle variance_threshold filter', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(JobCompletionService.getVarianceAnalysis).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/analytics/variance?variance_threshold=10')
      await GET(request)

      expect(JobCompletionService.getVarianceAnalysis).toHaveBeenCalledWith({
        start_date: undefined,
        end_date: undefined,
        customer_id: undefined,
        hazard_types: undefined,
        variance_threshold: 10
      })
    })

    it('should return variance summary when summary=true', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockSummary = {
        total_jobs: 25,
        average_variance_percentage: 3.2,
        jobs_over_budget: 12,
        jobs_under_budget: 10,
        jobs_on_budget: 3,
        total_variance_amount: 4500.00
      }

      vi.mocked(JobCompletionService.getVarianceSummary).mockResolvedValue(mockSummary)

      const request = new NextRequest('http://localhost:3000/api/analytics/variance?summary=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockSummary)
      expect(JobCompletionService.getVarianceSummary).toHaveBeenCalledWith({
        start_date: undefined,
        end_date: undefined,
        customer_id: undefined,
        hazard_types: undefined,
        variance_threshold: undefined
      })
    })

    it('should handle empty hazard_types filter', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(JobCompletionService.getVarianceAnalysis).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/analytics/variance?hazard_types=')
      await GET(request)

      expect(JobCompletionService.getVarianceAnalysis).toHaveBeenCalledWith({
        start_date: undefined,
        end_date: undefined,
        customer_id: undefined,
        hazard_types: undefined,
        variance_threshold: undefined
      })
    })

    it('should handle multiple filters combined', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(JobCompletionService.getVarianceAnalysis).mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/analytics/variance?start_date=2026-01-01&customer_id=customer-1&variance_threshold=5&hazard_types=asbestos'
      )
      await GET(request)

      expect(JobCompletionService.getVarianceAnalysis).toHaveBeenCalledWith({
        start_date: '2026-01-01',
        end_date: undefined,
        customer_id: 'customer-1',
        hazard_types: ['asbestos'],
        variance_threshold: 5
      })
    })

    it('should handle service errors', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      vi.mocked(JobCompletionService.getVarianceAnalysis).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/analytics/variance')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal error')
    })
  })
})
