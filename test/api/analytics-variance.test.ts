import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/analytics/variance/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() }))
    }))
  }))
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

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { JobCompletionService } from '@/lib/services/job-completion-service'
import type { VarianceAnalysis, VarianceSummary } from '@/types/job-completion'

describe('Analytics Variance API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/analytics/variance', () => {
    it('should return variance analysis for jobs', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any)

      const mockVariance: VarianceAnalysis[] = [
        {
          job_id: 'job-1',
          job_number: 'JOB-001',
          job_name: 'Asbestos Removal',
          customer_name: 'Acme Corp',
          completion_date: '2026-01-15',
          estimated_hours: 40,
          actual_hours: 45,
          hours_variance: 5,
          hours_variance_percent: 12.5,
          estimated_cost: 10000,
          actual_cost: 12000,
          cost_variance: 2000,
          cost_variance_percent: 20,
          materials_summary: []
        }
      ]

      vi.mocked(JobCompletionService.getVarianceAnalysis).mockResolvedValue(mockVariance)

      const request = new NextRequest('http://localhost:3000/api/analytics/variance')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].cost_variance).toBe(2000)
      expect(JobCompletionService.getVarianceAnalysis).toHaveBeenCalled()
    })

    it('should return variance summary when summary flag is true', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any)

      const mockSummary: VarianceSummary = {
        total_jobs: 25,
        over_budget_count: 15,
        under_budget_count: 8,
        on_target_count: 2,
        avg_hours_variance: 10.2,
        avg_cost_variance: 15.5,
        total_hours_variance: 250,
        total_cost_variance: 5000
      }

      vi.mocked(JobCompletionService.getVarianceSummary).mockResolvedValue(mockSummary)

      const request = new NextRequest('http://localhost:3000/api/analytics/variance?summary=true')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.total_jobs).toBe(25)
      expect(data.avg_cost_variance).toBe(15.5)
      expect(JobCompletionService.getVarianceSummary).toHaveBeenCalled()
    })

    it('should support filtering by date range and customer', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any)

      vi.mocked(JobCompletionService.getVarianceAnalysis).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/analytics/variance?start_date=2026-01-01&end_date=2026-01-31&customer_id=550e8400-e29b-41d4-a716-446655440000')

      // Act
      await GET(request)

      // Assert
      expect(JobCompletionService.getVarianceAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: '2026-01-01',
          end_date: '2026-01-31',
          customer_id: '550e8400-e29b-41d4-a716-446655440000'
        })
      )
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/variance')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
