import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/billing/features/route'
import { FeatureFlagsService } from '@/lib/services/feature-flags-service'

// Mock dependencies
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
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

describe('GET /api/billing/features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'owner'
  }

  it('should return feature flags and usage data for authenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
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

    const mockFeatureFlags = {
      ai_photo_analysis: true,
      advanced_reporting: true,
      api_access: false,
      custom_branding: true
    }

    const mockUsageLimits = {
      max_users: 20,
      max_jobs_per_month: 200,
      max_storage_gb: 100
    }

    const mockUsageStats = {
      current_users: 15,
      jobs_this_month: 142,
      storage_used_gb: 45.2
    }

    const mockUsageWarnings = []

    vi.mocked(FeatureFlagsService.getFeatureFlagsForOrg).mockResolvedValue(mockFeatureFlags)
    vi.mocked(FeatureFlagsService.getUsageLimitsForOrg).mockResolvedValue(mockUsageLimits)
    vi.mocked(FeatureFlagsService.getUsageStats).mockResolvedValue(mockUsageStats)
    vi.mocked(FeatureFlagsService.checkUsageWarnings).mockResolvedValue(mockUsageWarnings)

    const request = new NextRequest('http://localhost:3000/api/billing/features')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      features: mockFeatureFlags,
      limits: mockUsageLimits,
      usage: mockUsageStats,
      warnings: mockUsageWarnings
    })

    expect(FeatureFlagsService.getFeatureFlagsForOrg).toHaveBeenCalledWith('org-123')
    expect(FeatureFlagsService.getUsageLimitsForOrg).toHaveBeenCalledWith('org-123')
    expect(FeatureFlagsService.getUsageStats).toHaveBeenCalledWith('org-123')
    expect(FeatureFlagsService.checkUsageWarnings).toHaveBeenCalledWith('org-123')
  })

  it('should return usage warnings when approaching limits', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
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
      {
        type: 'usage_high',
        resource: 'jobs',
        current: 180,
        limit: 200,
        percentage: 90,
        message: 'You are approaching your monthly job limit'
      },
      {
        type: 'usage_high',
        resource: 'storage',
        current: 85,
        limit: 100,
        percentage: 85,
        message: 'You are approaching your storage limit'
      }
    ]

    vi.mocked(FeatureFlagsService.getFeatureFlagsForOrg).mockResolvedValue({})
    vi.mocked(FeatureFlagsService.getUsageLimitsForOrg).mockResolvedValue({})
    vi.mocked(FeatureFlagsService.getUsageStats).mockResolvedValue({})
    vi.mocked(FeatureFlagsService.checkUsageWarnings).mockResolvedValue(mockWarnings)

    const request = new NextRequest('http://localhost:3000/api/billing/features')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.warnings).toEqual(mockWarnings)
    expect(data.warnings).toHaveLength(2)
  })

  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/billing/features')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.type).toBe('UNAUTHORIZED')
  })

  it('should work for all authenticated roles', async () => {
    const roles = ['owner', 'admin', 'user', 'tenant_owner']

    for (const role of roles) {
      vi.clearAllMocks()

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: `user-${role}`, email: `${role}@example.com` } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123', role },
              error: null
            })
          })
        })
      } as any)

      vi.mocked(FeatureFlagsService.getFeatureFlagsForOrg).mockResolvedValue({})
      vi.mocked(FeatureFlagsService.getUsageLimitsForOrg).mockResolvedValue({})
      vi.mocked(FeatureFlagsService.getUsageStats).mockResolvedValue({})
      vi.mocked(FeatureFlagsService.checkUsageWarnings).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/billing/features')
      const response = await GET(request)

      expect(response.status).toBe(200)
    }
  })

  it('should handle unlimited plan limits correctly', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
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

    const mockUnlimitedLimits = {
      max_users: -1,
      max_jobs_per_month: -1,
      max_storage_gb: -1
    }

    vi.mocked(FeatureFlagsService.getFeatureFlagsForOrg).mockResolvedValue({})
    vi.mocked(FeatureFlagsService.getUsageLimitsForOrg).mockResolvedValue(mockUnlimitedLimits)
    vi.mocked(FeatureFlagsService.getUsageStats).mockResolvedValue({})
    vi.mocked(FeatureFlagsService.checkUsageWarnings).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/billing/features')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.limits).toEqual(mockUnlimitedLimits)
  })

  it('should handle service errors gracefully', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
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

    vi.mocked(FeatureFlagsService.getFeatureFlagsForOrg).mockRejectedValue(
      new Error('Database connection failed')
    )

    const request = new NextRequest('http://localhost:3000/api/billing/features')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
    expect(data.error).not.toContain('Database')
  })

  it('should handle partial service failures', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
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

    vi.mocked(FeatureFlagsService.getFeatureFlagsForOrg).mockResolvedValue({})
    vi.mocked(FeatureFlagsService.getUsageLimitsForOrg).mockResolvedValue({})
    vi.mocked(FeatureFlagsService.getUsageStats).mockRejectedValue(new Error('Stats error'))
    vi.mocked(FeatureFlagsService.checkUsageWarnings).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/billing/features')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
  })

  it('should fetch all data in parallel for performance', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
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

    let callOrder: string[] = []

    vi.mocked(FeatureFlagsService.getFeatureFlagsForOrg).mockImplementation(async () => {
      callOrder.push('features')
      return {}
    })

    vi.mocked(FeatureFlagsService.getUsageLimitsForOrg).mockImplementation(async () => {
      callOrder.push('limits')
      return {}
    })

    vi.mocked(FeatureFlagsService.getUsageStats).mockImplementation(async () => {
      callOrder.push('stats')
      return {}
    })

    vi.mocked(FeatureFlagsService.checkUsageWarnings).mockImplementation(async () => {
      callOrder.push('warnings')
      return []
    })

    const request = new NextRequest('http://localhost:3000/api/billing/features')
    await GET(request)

    expect(callOrder).toHaveLength(4)
  })

  it('should handle zero usage correctly', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
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

    const mockZeroUsage = {
      current_users: 0,
      jobs_this_month: 0,
      storage_used_gb: 0
    }

    vi.mocked(FeatureFlagsService.getFeatureFlagsForOrg).mockResolvedValue({})
    vi.mocked(FeatureFlagsService.getUsageLimitsForOrg).mockResolvedValue({})
    vi.mocked(FeatureFlagsService.getUsageStats).mockResolvedValue(mockZeroUsage)
    vi.mocked(FeatureFlagsService.checkUsageWarnings).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/billing/features')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.usage).toEqual(mockZeroUsage)
  })

  it('should handle exceeded limits with warnings', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
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
      {
        type: 'usage_exceeded',
        resource: 'jobs',
        current: 205,
        limit: 200,
        percentage: 102.5,
        message: 'You have exceeded your monthly job limit'
      }
    ]

    vi.mocked(FeatureFlagsService.getFeatureFlagsForOrg).mockResolvedValue({})
    vi.mocked(FeatureFlagsService.getUsageLimitsForOrg).mockResolvedValue({ max_jobs_per_month: 200 })
    vi.mocked(FeatureFlagsService.getUsageStats).mockResolvedValue({ jobs_this_month: 205 })
    vi.mocked(FeatureFlagsService.checkUsageWarnings).mockResolvedValue(mockWarnings)

    const request = new NextRequest('http://localhost:3000/api/billing/features')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.warnings[0].type).toBe('usage_exceeded')
    expect(data.warnings[0].percentage).toBeGreaterThan(100)
  })
})
