import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/billing/plans/route'
import { StripeService } from '@/lib/services/stripe-service'

vi.mock('@/lib/services/stripe-service', () => ({
  StripeService: {
    getPlans: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('GET /api/billing/plans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return list of available plans', async () => {
    const mockPlans = [
      {
        id: 'plan-1',
        slug: 'starter',
        name: 'Starter',
        description: 'Perfect for small teams',
        price_monthly: 29,
        price_yearly: 290,
        features: [
          { name: 'Up to 5 users', included: true },
          { name: 'Basic support', included: true },
          { name: 'Priority support', included: false }
        ],
        limits: {
          max_users: 5,
          max_jobs_per_month: 50
        }
      },
      {
        id: 'plan-2',
        slug: 'professional',
        name: 'Professional',
        description: 'For growing businesses',
        price_monthly: 99,
        price_yearly: 990,
        features: [
          { name: 'Up to 20 users', included: true },
          { name: 'Basic support', included: true },
          { name: 'Priority support', included: true }
        ],
        limits: {
          max_users: 20,
          max_jobs_per_month: 200
        }
      }
    ]

    vi.mocked(StripeService.getPlans).mockResolvedValue(mockPlans)

    const request = new NextRequest('http://localhost:3000/api/billing/plans')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockPlans)
    expect(data).toHaveLength(2)
    expect(StripeService.getPlans).toHaveBeenCalledOnce()
  })

  it('should return empty array when no plans exist', async () => {
    vi.mocked(StripeService.getPlans).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/billing/plans')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should be accessible without authentication (public endpoint)', async () => {
    const mockPlans = [
      {
        id: 'plan-1',
        slug: 'starter',
        name: 'Starter',
        description: 'Basic plan',
        price_monthly: 29,
        price_yearly: 290,
        features: [],
        limits: {}
      }
    ]

    vi.mocked(StripeService.getPlans).mockResolvedValue(mockPlans)

    const request = new NextRequest('http://localhost:3000/api/billing/plans')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(mockPlans)
  })

  it('should handle service errors gracefully', async () => {
    vi.mocked(StripeService.getPlans).mockRejectedValue(
      new Error('Database connection failed')
    )

    const request = new NextRequest('http://localhost:3000/api/billing/plans')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
  })

  it('should handle Stripe API errors securely', async () => {
    vi.mocked(StripeService.getPlans).mockRejectedValue(
      new Error('Stripe API key invalid')
    )

    const request = new NextRequest('http://localhost:3000/api/billing/plans')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
    expect(data.error).not.toContain('Stripe API key')
  })

  it('should return plans with correct data structure', async () => {
    const mockPlans = [
      {
        id: 'plan-1',
        slug: 'enterprise',
        name: 'Enterprise',
        description: 'For large organizations',
        price_monthly: 299,
        price_yearly: 2990,
        features: [
          { name: 'Unlimited users', included: true },
          { name: 'Dedicated support', included: true },
          { name: 'Custom integrations', included: true }
        ],
        limits: {
          max_users: -1,
          max_jobs_per_month: -1,
          max_storage_gb: 1000
        },
        is_popular: false,
        is_custom: false
      }
    ]

    vi.mocked(StripeService.getPlans).mockResolvedValue(mockPlans)

    const request = new NextRequest('http://localhost:3000/api/billing/plans')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('slug')
    expect(data[0]).toHaveProperty('name')
    expect(data[0]).toHaveProperty('description')
    expect(data[0]).toHaveProperty('price_monthly')
    expect(data[0]).toHaveProperty('price_yearly')
    expect(data[0]).toHaveProperty('features')
    expect(data[0]).toHaveProperty('limits')
    expect(Array.isArray(data[0].features)).toBe(true)
  })

  it('should return plans sorted by price', async () => {
    const mockPlans = [
      {
        id: 'plan-1',
        slug: 'starter',
        name: 'Starter',
        price_monthly: 29,
        price_yearly: 290
      },
      {
        id: 'plan-2',
        slug: 'professional',
        name: 'Professional',
        price_monthly: 99,
        price_yearly: 990
      },
      {
        id: 'plan-3',
        slug: 'enterprise',
        name: 'Enterprise',
        price_monthly: 299,
        price_yearly: 2990
      }
    ]

    vi.mocked(StripeService.getPlans).mockResolvedValue(mockPlans)

    const request = new NextRequest('http://localhost:3000/api/billing/plans')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].price_monthly).toBeLessThanOrEqual(data[1].price_monthly)
    expect(data[1].price_monthly).toBeLessThanOrEqual(data[2].price_monthly)
  })

  it('should handle timeout errors', async () => {
    vi.mocked(StripeService.getPlans).mockRejectedValue(
      new Error('Request timeout')
    )

    const request = new NextRequest('http://localhost:3000/api/billing/plans')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
  })

  it('should handle malformed plan data', async () => {
    vi.mocked(StripeService.getPlans).mockResolvedValue(null as any)

    const request = new NextRequest('http://localhost:3000/api/billing/plans')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(await response.json()).toBeNull()
  })

  it('should cache plans data appropriately', async () => {
    const mockPlans = [
      {
        id: 'plan-1',
        slug: 'professional',
        name: 'Professional',
        price_monthly: 99,
        price_yearly: 990
      }
    ]

    vi.mocked(StripeService.getPlans).mockResolvedValue(mockPlans)

    const request1 = new NextRequest('http://localhost:3000/api/billing/plans')
    await GET(request1)

    const request2 = new NextRequest('http://localhost:3000/api/billing/plans')
    await GET(request2)

    expect(StripeService.getPlans).toHaveBeenCalledTimes(2)
  })
})
