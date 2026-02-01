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

describe('Billing Plans API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/billing/plans', () => {
    it('should return list of available plans', async () => {
      // Arrange
      const mockPlans = [
        {
          id: 'plan-basic',
          name: 'Basic Plan',
          price: 29,
          interval: 'month',
          features: ['Up to 5 users', '50 jobs/month', '10GB storage']
        },
        {
          id: 'plan-pro',
          name: 'Professional Plan',
          price: 99,
          interval: 'month',
          features: ['Up to 20 users', '200 jobs/month', '100GB storage', 'Advanced reporting']
        },
        {
          id: 'plan-enterprise',
          name: 'Enterprise Plan',
          price: 299,
          interval: 'month',
          features: ['Unlimited users', 'Unlimited jobs', '1TB storage', 'Priority support', 'Custom integrations']
        }
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
      const mockPlans = [
        {
          id: 'plan-starter',
          name: 'Starter',
          price: 49,
          interval: 'month',
          features: ['Feature A', 'Feature B']
        }
      ]

      vi.mocked(StripeService.getPlans).mockResolvedValue(mockPlans)

      const request = new NextRequest('http://localhost:3000/api/billing/plans')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data[0].price).toBe(49)
      expect(data[0].interval).toBe('month')
      expect(data[0].features).toContain('Feature A')
    })
  })
})
