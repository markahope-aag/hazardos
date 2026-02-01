import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/billing/portal/route'
import { StripeService } from '@/lib/services/stripe-service'

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

vi.mock('@/lib/services/stripe-service', () => ({
  StripeService: {
    createBillingPortalSession: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('POST /api/billing/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set default environment variable
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'owner'
  }

  it('should create billing portal session with custom return URL', async () => {
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

    const mockPortalUrl = 'https://billing.stripe.com/portal/session-123'
    vi.mocked(StripeService.createBillingPortalSession).mockResolvedValue(mockPortalUrl)

    const request = new NextRequest('http://localhost:3000/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({
        return_url: 'https://example.com/settings'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ url: mockPortalUrl })
    expect(StripeService.createBillingPortalSession).toHaveBeenCalledWith(
      'org-123',
      'https://example.com/settings'
    )
  })

  it('should use default return URL when not provided', async () => {
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

    const mockPortalUrl = 'https://billing.stripe.com/portal/session-456'
    vi.mocked(StripeService.createBillingPortalSession).mockResolvedValue(mockPortalUrl)

    const request = new NextRequest('http://localhost:3000/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({})
    })

    await POST(request)

    expect(StripeService.createBillingPortalSession).toHaveBeenCalledWith(
      'org-123',
      'https://app.example.com/settings/billing'
    )
  })

  it('should work for any authenticated user role', async () => {
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

      vi.mocked(StripeService.createBillingPortalSession).mockResolvedValue(
        'https://billing.stripe.com/portal/session'
      )

      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        body: JSON.stringify({ return_url: 'https://example.com/settings' })
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    }
  })

  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({ return_url: 'https://example.com/settings' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.type).toBe('UNAUTHORIZED')
  })

  it('should validate return_url is a valid URL', async () => {
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

    const request = new NextRequest('http://localhost:3000/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({ return_url: 'not-a-valid-url' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should handle Stripe service errors securely', async () => {
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

    vi.mocked(StripeService.createBillingPortalSession).mockRejectedValue(
      new Error('Stripe API key invalid')
    )

    const request = new NextRequest('http://localhost:3000/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({ return_url: 'https://example.com/settings' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
    expect(data.error).not.toContain('Stripe API key')
  })

  it('should handle no active subscription error', async () => {
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

    vi.mocked(StripeService.createBillingPortalSession).mockRejectedValue(
      new Error('No active subscription found')
    )

    const request = new NextRequest('http://localhost:3000/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({ return_url: 'https://example.com/settings' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
  })

  it('should handle database errors when fetching profile', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      })
    } as any)

    const request = new NextRequest('http://localhost:3000/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({ return_url: 'https://example.com/settings' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
  })
})
