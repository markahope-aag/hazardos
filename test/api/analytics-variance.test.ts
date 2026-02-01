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

      const mockVariance = [
        {
          job_id: 'job-1',
          estimated_cost: 10000,
          actual_cost: 12000,
          variance: 2000,
          variance_percentage: 20
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
      expect(data[0].variance).toBe(2000)
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

      const mockSummary = {
        total_jobs: 25,
        avg_variance: 15.5,
        total_variance: 5000
      }

      vi.mocked(JobCompletionService.getVarianceSummary).mockResolvedValue(mockSummary)

      const request = new NextRequest('http://localhost:3000/api/analytics/variance?summary=true')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.total_jobs).toBe(25)
      expect(data.avg_variance).toBe(15.5)
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
