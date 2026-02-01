import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/billing/checkout/route'
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
    createCheckoutSession: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('POST /api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validCheckoutData = {
    plan_slug: 'professional',
    billing_cycle: 'monthly' as const,
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel'
  }

  const mockProfile = {
    organization_id: 'org-123',
    role: 'owner'
  }

  it('should create checkout session for authenticated user with owner role', async () => {
    // Mock authenticated user
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
      error: null
    })

    // Mock profile
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

    // Mock checkout session creation
    const mockCheckoutUrl = 'https://checkout.stripe.com/session-123'
    vi.mocked(StripeService.createCheckoutSession).mockResolvedValue(mockCheckoutUrl)

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(validCheckoutData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ url: mockCheckoutUrl })
    expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
      'org-123',
      'professional',
      'monthly',
      'https://example.com/success',
      'https://example.com/cancel'
    )
  })

  it('should create checkout session for admin role', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-2', email: 'admin@example.com' } },
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

    const mockCheckoutUrl = 'https://checkout.stripe.com/session-456'
    vi.mocked(StripeService.createCheckoutSession).mockResolvedValue(mockCheckoutUrl)

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(validCheckoutData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ url: mockCheckoutUrl })
  })

  it('should create checkout session for tenant_owner role', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-3', email: 'tenant@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-123', role: 'tenant_owner' },
            error: null
          })
        })
      })
    } as any)

    const mockCheckoutUrl = 'https://checkout.stripe.com/session-789'
    vi.mocked(StripeService.createCheckoutSession).mockResolvedValue(mockCheckoutUrl)

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(validCheckoutData)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should create checkout session with yearly billing cycle', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
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

    vi.mocked(StripeService.createCheckoutSession).mockResolvedValue('https://checkout.stripe.com/session')

    const yearlyData = {
      ...validCheckoutData,
      billing_cycle: 'yearly' as const
    }

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(yearlyData)
    })

    await POST(request)

    expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
      'org-123',
      'professional',
      'yearly',
      'https://example.com/success',
      'https://example.com/cancel'
    )
  })

  it('should default to monthly billing cycle when not specified', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
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

    vi.mocked(StripeService.createCheckoutSession).mockResolvedValue('https://checkout.stripe.com/session')

    const dataWithoutCycle = {
      plan_slug: 'professional',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel'
    }

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(dataWithoutCycle)
    })

    await POST(request)

    expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
      'org-123',
      'professional',
      'monthly',
      'https://example.com/success',
      'https://example.com/cancel'
    )
  })

  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(validCheckoutData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.type).toBe('UNAUTHORIZED')
  })

  it('should return 403 for user role without permission', async () => {
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

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(validCheckoutData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.type).toBe('FORBIDDEN')
  })

  it('should validate required plan_slug field', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
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

    const invalidData = {
      plan_slug: '',
      billing_cycle: 'monthly',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel'
    }

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should validate success_url is valid URL', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
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

    const invalidData = {
      plan_slug: 'professional',
      billing_cycle: 'monthly',
      success_url: 'not-a-url',
      cancel_url: 'https://example.com/cancel'
    }

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should validate cancel_url is valid URL', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
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

    const invalidData = {
      plan_slug: 'professional',
      billing_cycle: 'monthly',
      success_url: 'https://example.com/success',
      cancel_url: 'invalid-url'
    }

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should handle Stripe service errors securely', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
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

    vi.mocked(StripeService.createCheckoutSession).mockRejectedValue(
      new Error('Stripe API key invalid')
    )

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(validCheckoutData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
    expect(data.error).not.toContain('Stripe API key')
  })

  it('should handle plan not found error', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
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

    vi.mocked(StripeService.createCheckoutSession).mockRejectedValue(
      new Error('Plan not found')
    )

    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(validCheckoutData)
    })

    const response = await POST(request)

    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})
