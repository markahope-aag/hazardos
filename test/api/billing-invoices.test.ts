import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/billing/invoices/route'
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
    getInvoices: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('GET /api/billing/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'owner'
  }

  it('should return list of billing invoices for authenticated user', async () => {
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

    const mockInvoices = [
      {
        id: 'inv-1',
        stripe_invoice_id: 'in_123',
        organization_id: 'org-123',
        amount_due: 9900,
        amount_paid: 9900,
        currency: 'usd',
        status: 'paid',
        invoice_pdf: 'https://invoice.stripe.com/pdf-1',
        hosted_invoice_url: 'https://invoice.stripe.com/inv-1',
        period_start: '2026-01-01T00:00:00Z',
        period_end: '2026-01-31T23:59:59Z',
        created_at: '2026-01-01T00:00:00Z'
      },
      {
        id: 'inv-2',
        stripe_invoice_id: 'in_456',
        organization_id: 'org-123',
        amount_due: 9900,
        amount_paid: 0,
        currency: 'usd',
        status: 'open',
        invoice_pdf: 'https://invoice.stripe.com/pdf-2',
        hosted_invoice_url: 'https://invoice.stripe.com/inv-2',
        period_start: '2026-02-01T00:00:00Z',
        period_end: '2026-02-28T23:59:59Z',
        created_at: '2026-02-01T00:00:00Z'
      }
    ]

    vi.mocked(StripeService.getInvoices).mockResolvedValue(mockInvoices)

    const request = new NextRequest('http://localhost:3000/api/billing/invoices')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockInvoices)
    expect(data).toHaveLength(2)
    expect(StripeService.getInvoices).toHaveBeenCalledWith('org-123')
  })

  it('should return empty array when no invoices exist', async () => {
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

    vi.mocked(StripeService.getInvoices).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/billing/invoices')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/billing/invoices')
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

      vi.mocked(StripeService.getInvoices).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/billing/invoices')
      const response = await GET(request)

      expect(response.status).toBe(200)
    }
  })

  it('should return invoices sorted by date descending', async () => {
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

    const mockInvoices = [
      {
        id: 'inv-3',
        created_at: '2026-03-01T00:00:00Z',
        status: 'paid'
      },
      {
        id: 'inv-2',
        created_at: '2026-02-01T00:00:00Z',
        status: 'paid'
      },
      {
        id: 'inv-1',
        created_at: '2026-01-01T00:00:00Z',
        status: 'paid'
      }
    ]

    vi.mocked(StripeService.getInvoices).mockResolvedValue(mockInvoices)

    const request = new NextRequest('http://localhost:3000/api/billing/invoices')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(new Date(data[0].created_at).getTime()).toBeGreaterThanOrEqual(
      new Date(data[1].created_at).getTime()
    )
    expect(new Date(data[1].created_at).getTime()).toBeGreaterThanOrEqual(
      new Date(data[2].created_at).getTime()
    )
  })

  it('should handle invoices with different statuses', async () => {
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

    const mockInvoices = [
      { id: 'inv-1', status: 'paid' },
      { id: 'inv-2', status: 'open' },
      { id: 'inv-3', status: 'void' },
      { id: 'inv-4', status: 'draft' },
      { id: 'inv-5', status: 'uncollectible' }
    ]

    vi.mocked(StripeService.getInvoices).mockResolvedValue(mockInvoices)

    const request = new NextRequest('http://localhost:3000/api/billing/invoices')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(5)
    expect(data.map((inv: any) => inv.status)).toContain('paid')
    expect(data.map((inv: any) => inv.status)).toContain('open')
    expect(data.map((inv: any) => inv.status)).toContain('void')
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

    vi.mocked(StripeService.getInvoices).mockRejectedValue(
      new Error('Stripe API error: unauthorized')
    )

    const request = new NextRequest('http://localhost:3000/api/billing/invoices')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
    expect(data.error).not.toContain('Stripe API')
    expect(data.error).not.toContain('unauthorized')
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

    const request = new NextRequest('http://localhost:3000/api/billing/invoices')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
  })

  it('should handle invoices with refunds', async () => {
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

    const mockInvoices = [
      {
        id: 'inv-1',
        amount_due: 9900,
        amount_paid: 9900,
        amount_remaining: 0,
        status: 'paid',
        refunded: true,
        amount_refunded: 9900
      }
    ]

    vi.mocked(StripeService.getInvoices).mockResolvedValue(mockInvoices)

    const request = new NextRequest('http://localhost:3000/api/billing/invoices')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].refunded).toBe(true)
    expect(data[0].amount_refunded).toBe(9900)
  })

  it('should handle invoices with discounts', async () => {
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

    const mockInvoices = [
      {
        id: 'inv-1',
        subtotal: 9900,
        discount: 1000,
        amount_due: 8900,
        status: 'paid'
      }
    ]

    vi.mocked(StripeService.getInvoices).mockResolvedValue(mockInvoices)

    const request = new NextRequest('http://localhost:3000/api/billing/invoices')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].discount).toBe(1000)
    expect(data[0].amount_due).toBeLessThan(data[0].subtotal)
  })

  it('should handle no active subscription scenario', async () => {
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

    vi.mocked(StripeService.getInvoices).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/billing/invoices')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })
})
