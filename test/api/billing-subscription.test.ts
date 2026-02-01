import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, DELETE } from '@/app/api/billing/subscription/route'
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
    getSubscription: vi.fn(),
    cancelSubscription: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Billing Subscription API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'owner'
  }

  describe('GET /api/billing/subscription', () => {
    it('should return subscription for authenticated user', async () => {
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

      const mockSubscription = {
        id: 'sub-123',
        organization_id: 'org-123',
        plan_id: 'plan-1',
        status: 'active',
        billing_cycle: 'monthly',
        current_period_end: '2026-03-01T00:00:00Z',
        plan: {
          name: 'Professional',
          slug: 'professional',
          price_monthly: 99
        }
      }

      vi.mocked(StripeService.getSubscription).mockResolvedValue(mockSubscription)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockSubscription)
      expect(StripeService.getSubscription).toHaveBeenCalledWith('org-123')
    })

    it('should return null when no subscription exists', async () => {
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

      vi.mocked(StripeService.getSubscription).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toBeNull()
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/billing/subscription')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should handle service errors securely', async () => {
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

      vi.mocked(StripeService.getSubscription).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/billing/subscription')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('Database')
    })
  })

  describe('DELETE /api/billing/subscription', () => {
    it('should cancel subscription for owner role', async () => {
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

      vi.mocked(StripeService.cancelSubscription).mockResolvedValue(undefined)

      const cancelData = {
        reason: 'Too expensive',
        cancel_immediately: false
      }

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
        body: JSON.stringify(cancelData)
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(StripeService.cancelSubscription).toHaveBeenCalledWith(
        'org-123',
        'Too expensive',
        false
      )
    })

    it('should cancel subscription for admin role', async () => {
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

      vi.mocked(StripeService.cancelSubscription).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Switching provider' })
      })

      const response = await DELETE(request)

      expect(response.status).toBe(200)
    })

    it('should cancel subscription for tenant_owner role', async () => {
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

      vi.mocked(StripeService.cancelSubscription).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Not needed' })
      })

      const response = await DELETE(request)

      expect(response.status).toBe(200)
    })

    it('should cancel subscription immediately when requested', async () => {
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

      vi.mocked(StripeService.cancelSubscription).mockResolvedValue(undefined)

      const cancelData = {
        reason: 'Emergency cancellation',
        cancel_immediately: true
      }

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
        body: JSON.stringify(cancelData)
      })

      await DELETE(request)

      expect(StripeService.cancelSubscription).toHaveBeenCalledWith(
        'org-123',
        'Emergency cancellation',
        true
      )
    })

    it('should default to cancel_immediately false when not specified', async () => {
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

      vi.mocked(StripeService.cancelSubscription).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Test' })
      })

      await DELETE(request)

      expect(StripeService.cancelSubscription).toHaveBeenCalledWith(
        'org-123',
        'Test',
        false
      )
    })

    it('should allow cancellation without reason', async () => {
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

      vi.mocked(StripeService.cancelSubscription).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
        body: JSON.stringify({})
      })

      const response = await DELETE(request)

      expect(response.status).toBe(200)
      expect(StripeService.cancelSubscription).toHaveBeenCalledWith(
        'org-123',
        undefined,
        false
      )
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Test' })
      })

      const response = await DELETE(request)
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

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Test' })
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.type).toBe('FORBIDDEN')
    })

    it('should validate reason length does not exceed 1000 characters', async () => {
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

      const longReason = 'a'.repeat(1001)

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
        body: JSON.stringify({ reason: longReason })
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
    })

    it('should handle no active subscription error', async () => {
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

      vi.mocked(StripeService.cancelSubscription).mockRejectedValue(
        new Error('No active subscription')
      )

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Test' })
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.type).toBe('INTERNAL_ERROR')
    })

    it('should handle Stripe errors securely', async () => {
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

      vi.mocked(StripeService.cancelSubscription).mockRejectedValue(
        new Error('Stripe API error: invalid credentials')
      )

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Test' })
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('Stripe API')
      expect(data.error).not.toContain('credentials')
    })
  })
})
