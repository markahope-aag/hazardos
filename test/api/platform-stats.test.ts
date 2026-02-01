import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/platform/stats/route'

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

vi.mock('@/lib/services/platform-admin-service', () => ({
  PlatformAdminService: {
    isPlatformAdmin: vi.fn(),
    getPlatformStats: vi.fn(),
    getGrowthMetrics: vi.fn(),
    getPlanDistribution: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { PlatformAdminService } from '@/lib/services/platform-admin-service'

describe('Platform Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockPlatformAdminProfile = {
    organization_id: 'platform',
    role: 'platform_admin'
  }

  describe('GET /api/platform/stats', () => {
    it('should return platform statistics for platform admin', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPlatformAdminProfile,
              error: null
            })
          })
        })
      } as any)

      vi.mocked(PlatformAdminService.isPlatformAdmin).mockResolvedValue(true)

      const mockStats = {
        total_organizations: 142,
        total_users: 1235,
        total_jobs: 8964,
        active_organizations: 128
      }

      const mockGrowth = {
        organizations_growth: 12,
        users_growth: 156,
        jobs_growth: 432
      }

      const mockPlanDistribution = {
        basic: 45,
        pro: 67,
        enterprise: 30
      }

      vi.mocked(PlatformAdminService.getPlatformStats).mockResolvedValue(mockStats)
      vi.mocked(PlatformAdminService.getGrowthMetrics).mockResolvedValue(mockGrowth)
      vi.mocked(PlatformAdminService.getPlanDistribution).mockResolvedValue(mockPlanDistribution)

      const request = new NextRequest('http://localhost:3000/api/platform/stats')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.stats).toEqual(mockStats)
      expect(data.growth).toEqual(mockGrowth)
      expect(data.planDistribution).toEqual(mockPlanDistribution)
    })

    it('should reject non-platform admin users', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123', role: 'admin' },
              error: null
            })
          })
        })
      } as any)

      const request = new NextRequest('http://localhost:3000/api/platform/stats')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(403)
    })

    it('should reject when isPlatformAdmin returns false', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockPlatformAdminProfile,
              error: null
            })
          })
        })
      } as any)

      vi.mocked(PlatformAdminService.isPlatformAdmin).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/platform/stats')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(403)
    })
  })
})
