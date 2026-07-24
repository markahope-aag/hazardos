import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/billing/plans/route'

vi.mock('@/lib/services/stripe-service', () => ({
  StripeService: {
    getPlans: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { StripeService } from '@/lib/services/stripe-service'
import type { SubscriptionPlan } from '@/types/billing'

function buildMockPlan(overrides: Partial<SubscriptionPlan>): SubscriptionPlan {
  return {
    id: 'plan-basic',
    name: 'Basic Plan',
    slug: 'basic',
    description: null,
    price_monthly: 29,
    price_yearly: null,
    stripe_product_id: null,
    stripe_price_id_monthly: null,
    stripe_price_id_yearly: null,
    max_users: 5,
    max_jobs_per_month: 50,
    max_storage_gb: 10,
    features: [],
    feature_flags: {},
    is_active: true,
    is_public: true,
    display_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

describe('Billing Plans API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/billing/plans', () => {
    it('should return list of available plans', async () => {
      // Arrange
      const mockPlans: SubscriptionPlan[] = [
        buildMockPlan({
          id: 'plan-basic',
          name: 'Basic Plan',
          price_monthly: 29,
          features: ['Up to 5 users', '50 jobs/month', '10GB storage']
        }),
        buildMockPlan({
          id: 'plan-pro',
          name: 'Professional Plan',
          price_monthly: 99,
          features: ['Up to 20 users', '200 jobs/month', '100GB storage', 'Advanced reporting']
        }),
        buildMockPlan({
          id: 'plan-enterprise',
          name: 'Enterprise Plan',
          price_monthly: 299,
          features: ['Unlimited users', 'Unlimited jobs', '1TB storage', 'Priority support', 'Custom integrations']
        })
      ]

      vi.mocked(StripeService.getPlans).mockResolvedValue(mockPlans)

      const request = new NextRequest('http://localhost:3000/api/billing/plans')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(3)
      expect(data[0].id).toBe('plan-basic')
      expect(data[1].id).toBe('plan-pro')
      expect(data[2].id).toBe('plan-enterprise')
      expect(StripeService.getPlans).toHaveBeenCalled()
    })

    it('should return empty array when no plans available', async () => {
      // Arrange
      vi.mocked(StripeService.getPlans).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/billing/plans')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should include plan pricing and features', async () => {
      // Arrange
      const mockPlans: SubscriptionPlan[] = [
        buildMockPlan({
          id: 'plan-starter',
          name: 'Starter',
          price_monthly: 49,
          features: ['Feature A', 'Feature B']
        })
      ]

      vi.mocked(StripeService.getPlans).mockResolvedValue(mockPlans)

      const request = new NextRequest('http://localhost:3000/api/billing/plans')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data[0].price_monthly).toBe(49)
      expect(data[0].features).toContain('Feature A')
    })
  })
})
