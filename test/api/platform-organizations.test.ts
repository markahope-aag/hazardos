import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/platform/organizations/route'
import { PlatformAdminService } from '@/lib/services/platform-admin-service'

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
    getOrganizations: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('GET /api/platform/organizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return organizations for platform admin', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@platform.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'platform', role: 'platform_admin' },
            error: null
          })
        })
      })
    } as any)

    vi.mocked(PlatformAdminService.isPlatformAdmin).mockResolvedValue(true)

    const mockOrgs = {
      organizations: [
        { id: 'org-1', name: 'Company A', status: 'active' },
        { id: 'org-2', name: 'Company B', status: 'active' }
      ],
      total: 2,
      page: 1,
      limit: 20
    }

    vi.mocked(PlatformAdminService.getOrganizations).mockResolvedValue(mockOrgs)

    const request = new NextRequest('http://localhost:3000/api/platform/organizations')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockOrgs)
  })

  it('should return 403 for non-platform admin', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-123', role: 'user' },
            error: null
          })
        })
      })
    } as any)

    const request = new NextRequest('http://localhost:3000/api/platform/organizations')
    const response = await GET(request)

    expect(response.status).toBe(403)
  })

  it('should support filtering and pagination', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@platform.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'platform', role: 'platform_admin' },
            error: null
          })
        })
      })
    } as any)

    vi.mocked(PlatformAdminService.isPlatformAdmin).mockResolvedValue(true)
    vi.mocked(PlatformAdminService.getOrganizations).mockResolvedValue({
      organizations: [],
      total: 0,
      page: 2,
      limit: 10
    })

    const request = new NextRequest('http://localhost:3000/api/platform/organizations?page=2&limit=10&status=active')
    await GET(request)

    expect(PlatformAdminService.getOrganizations).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 10,
        status: 'active'
      })
    )
  })
})
