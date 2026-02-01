import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/billing/features/route'

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

vi.mock('@/lib/services/feature-flags-service', () => ({
  FeatureFlagsService: {
    getFeatureFlagsForOrg: vi.fn(),
    getUsageLimitsForOrg: vi.fn(),
    getUsageStats: vi.fn(),
    checkUsageWarnings: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { FeatureFlagsService } from '@/lib/services/feature-flags-service'

describe('Billing Features API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/billing/features', () => {
    it('should return feature flags and usage information', async () => {
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

      const mockFeatures = {
        advanced_reporting: true,
        ai_estimates: true,
        custom_branding: false
      }

      const mockLimits = {
        max_users: 10,
        max_jobs_per_month: 100,
        max_storage_gb: 50
      }

      const mockUsage = {
        users_count: 5,
        jobs_this_month: 45,
        storage_used_gb: 12.5
      }

      const mockWarnings = []

      vi.mocked(FeatureFlagsService.getFeatureFlagsForOrg).mockResolvedValue(mockFeatures)
      vi.mocked(FeatureFlagsService.getUsageLimitsForOrg).mockResolvedValue(mockLimits)
      vi.mocked(FeatureFlagsService.getUsageStats).mockResolvedValue(mockUsage)
      vi.mocked(FeatureFlagsService.checkUsageWarnings).mockResolvedValue(mockWarnings)

      const request = new NextRequest('http://localhost:3000/api/billing/features')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.features).toEqual(mockFeatures)
      expect(data.limits).toEqual(mockLimits)
      expect(data.usage).toEqual(mockUsage)
      expect(data.warnings).toEqual(mockWarnings)
      expect(FeatureFlagsService.getFeatureFlagsForOrg).toHaveBeenCalledWith('org-123')
    })

    it('should return usage warnings when approaching limits', async () => {
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

      const mockWarnings = [
        { type: 'storage', message: 'Storage usage at 90% of limit', severity: 'warning' },
        { type: 'jobs', message: 'Jobs this month at 85% of limit', severity: 'info' }
      ]

      vi.mocked(FeatureFlagsService.getFeatureFlagsForOrg).mockResolvedValue({})
      vi.mocked(FeatureFlagsService.getUsageLimitsForOrg).mockResolvedValue({})
      vi.mocked(FeatureFlagsService.getUsageStats).mockResolvedValue({})
      vi.mocked(FeatureFlagsService.checkUsageWarnings).mockResolvedValue(mockWarnings)

      const request = new NextRequest('http://localhost:3000/api/billing/features')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.warnings).toHaveLength(2)
      expect(data.warnings[0].type).toBe('storage')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/billing/features')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
