import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/onboard/complete/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
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

// Mock api-handler to bypass auth context checks
vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  // Import secure-error-handler separately
  const errorHandler = await import('@/lib/utils/secure-error-handler')

  return {
    ...actual,
    createApiHandler: (options: any, handler: any) => {
      return async (request: any) => {
        try {
          // Create minimal context that the route expects
          const mockContext = {
            user: { id: 'user-123', email: 'owner@company.com' },
            profile: { organization_id: null, role: 'owner' },
            supabase: mockSupabaseClient,
            log: {
              info: vi.fn(),
              error: vi.fn(),
              warn: vi.fn()
            },
            requestId: 'test-request-id'
          }

          // Parse body
          const body = await request.json()

          // Call handler directly
          return await handler(request, mockContext, body, {})
        } catch (error) {
          // Convert errors to secure error responses
          return errorHandler.createSecureErrorResponse(error, {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn()
          })
        }
      }
    }
  }
})

import { StripeService } from '@/lib/services/stripe-service'

describe('Onboard Complete API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockUser = {
    id: 'user-123',
    email: 'owner@company.com'
  }

  describe('POST /api/onboard/complete', () => {
    it('should create organization and start trial', async () => {
      // Arrange
      let profileCallCount = 0

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          profileCallCount++

          if (profileCallCount === 1) {
            // First call - route checks if user already has organization
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { organization_id: null },
                    error: null
                  })
                })
              })
            } as any
          } else {
            // Second call - update profile with new organization
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null })
              })
            } as any
          }
        }

        if (table === 'subscription_plans') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'plan-123', name: 'Professional', slug: 'pro' },
                  error: null
                })
              })
            })
          } as any
        }

        if (table === 'organizations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'org-new-123', name: 'New Company' },
                  error: null
                })
              })
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          } as any
        }

        if (table === 'organization_subscriptions') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          } as any
        }

        throw new Error(`Unexpected table: ${table}`)
      })

      const request = new NextRequest('http://localhost:3000/api/onboard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: {
            name: 'New Company',
            address: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            zip: '62701',
            phone: '555-0100',
            email: 'contact@newcompany.com'
          },
          plan_id: 'plan-123',
          billing_cycle: 'monthly',
          start_trial: true
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.organizationId).toBe('org-new-123')
      expect(data.message).toContain('trial')
    })

    it('should create checkout session when not starting trial', async () => {
      // Arrange
      let profileCallCount = 0

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          profileCallCount++

          if (profileCallCount === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { organization_id: null },
                    error: null
                  })
                })
              })
            } as any
          }
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          } as any
        }

        if (table === 'subscription_plans') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'plan-pro', name: 'Professional', slug: 'pro' },
                  error: null
                })
              })
            })
          } as any
        }

        if (table === 'organizations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'org-456', name: 'Premium Company' },
                  error: null
                })
              })
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          } as any
        }

        if (table === 'organization_subscriptions') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          } as any
        }

        throw new Error(`Unexpected table: ${table}`)
      })

      vi.mocked(StripeService.createCheckoutSession).mockResolvedValue('https://checkout.stripe.com/session-123')

      const request = new NextRequest('http://localhost:3000/api/onboard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: {
            name: 'Premium Company',
            phone: '555-0200'
          },
          plan_id: 'plan-pro',
          billing_cycle: 'yearly',
          start_trial: false
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.checkoutUrl).toBe('https://checkout.stripe.com/session-123')
      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        'org-456',
        'pro',
        'yearly',
        expect.stringContaining('/dashboard'),
        expect.stringContaining('/onboard')
      )
    })

    it('should reject if user already has organization', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'existing-org' },
                  error: null
                })
              })
            })
          } as any
        }
        throw new Error(`Unexpected table: ${table}`)
      })

      const request = new NextRequest('http://localhost:3000/api/onboard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: { name: 'Test' },
          plan_id: '550e8400-e29b-41d4-a716-446655440001',
          billing_cycle: 'monthly',
          start_trial: true
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert - Should return error response from secure-error-handler
      expect(response.status).toBe(400)
      expect(data.error).toBeTruthy()
    })

  })
})
