import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StripeService } from '@/lib/services/stripe-service'
import Stripe from 'stripe'

// Mock Stripe
vi.mock('stripe', () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
  }))
  return { default: StripeMock }
})

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  })),
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
  })),
  formatError: vi.fn((error, type) => ({ type, message: String(error) })),
}))

import { createClient } from '@/lib/supabase/server'

describe('StripeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set environment variable for tests
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  })

  describe('getOrCreateCustomer', () => {
    it('should return existing Stripe customer ID', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  stripe_customer_id: 'cus_existing123',
                  name: 'Test Org',
                },
                error: null,
              }),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const customerId = await StripeService.getOrCreateCustomer('org-123')

      expect(customerId).toBe('cus_existing123')
    })

    it('should create new Stripe customer when none exists', async () => {
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'organizations') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { stripe_customer_id: null, name: 'New Org' },
                    error: null,
                  }),
                })),
              })),
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
              })),
            }
          }
          if (table === 'profiles') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { email: 'owner@test.com' },
                      error: null,
                    }),
                  })),
                })),
              })),
            }
          }
          return {}
        }),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      // Mock Stripe customer creation
      const mockStripe = new Stripe('sk_test_mock', { apiVersion: '2026-01-28.clover' })
      vi.mocked(mockStripe.customers.create).mockResolvedValue({
        id: 'cus_new456',
      } as any)

      const customerId = await StripeService.getOrCreateCustomer('org-456')

      expect(customerId).toBe('cus_new456')
      expect(mockStripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Org',
          email: 'owner@test.com',
          metadata: {
            organization_id: 'org-456',
          },
        })
      )
    })
  })

  describe('createCheckoutSession', () => {
    it('should create checkout session with correct parameters', async () => {
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'organizations') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      stripe_customer_id: 'cus_123',
                      name: 'Test Org',
                    },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'subscription_plans') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'plan-pro',
                      slug: 'pro',
                      stripe_price_id_monthly: 'price_monthly_123',
                      stripe_price_id_yearly: 'price_yearly_123',
                    },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockStripe = new Stripe('sk_test_mock', { apiVersion: '2026-01-28.clover' })
      vi.mocked(mockStripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session/abc123',
      } as any)

      const sessionUrl = await StripeService.createCheckoutSession(
        'org-123',
        'pro',
        'monthly',
        'https://app.com/success',
        'https://app.com/cancel'
      )

      expect(sessionUrl).toBe('https://checkout.stripe.com/session/abc123')
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          mode: 'subscription',
          payment_method_types: ['card'],
          success_url: 'https://app.com/success',
          cancel_url: 'https://app.com/cancel',
        })
      )
    })

    it('should use yearly price ID for yearly billing cycle', async () => {
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'organizations') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { stripe_customer_id: 'cus_123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'subscription_plans') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'plan-pro',
                      stripe_price_id_monthly: 'price_monthly_123',
                      stripe_price_id_yearly: 'price_yearly_456',
                    },
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockStripe = new Stripe('sk_test_mock', { apiVersion: '2026-01-28.clover' })
      vi.mocked(mockStripe.checkout.sessions.create).mockResolvedValue({
        url: 'https://checkout.stripe.com/session/abc123',
      } as any)

      await StripeService.createCheckoutSession(
        'org-123',
        'pro',
        'yearly',
        'https://app.com/success',
        'https://app.com/cancel'
      )

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            {
              price: 'price_yearly_456',
              quantity: 1,
            },
          ],
        })
      )
    })

    it('should throw error when plan not found', async () => {
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'organizations') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { stripe_customer_id: 'cus_123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'subscription_plans') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                })),
              })),
            }
          }
          return {}
        }),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      await expect(
        StripeService.createCheckoutSession(
          'org-123',
          'nonexistent',
          'monthly',
          'https://app.com/success',
          'https://app.com/cancel'
        )
      ).rejects.toThrow('Plan not found')
    })
  })

  describe('createBillingPortalSession', () => {
    it('should create billing portal session', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { stripe_customer_id: 'cus_123' },
                error: null,
              }),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockStripe = new Stripe('sk_test_mock', { apiVersion: '2026-01-28.clover' })
      vi.mocked(mockStripe.billingPortal.sessions.create).mockResolvedValue({
        url: 'https://billing.stripe.com/session/xyz789',
      } as any)

      const portalUrl = await StripeService.createBillingPortalSession(
        'org-123',
        'https://app.com/settings'
      )

      expect(portalUrl).toBe('https://billing.stripe.com/session/xyz789')
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://app.com/settings',
      })
    })

    it('should throw error when no Stripe customer exists', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { stripe_customer_id: null },
                error: null,
              }),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      await expect(
        StripeService.createBillingPortalSession('org-123', 'https://app.com/settings')
      ).rejects.toThrow('No billing account found')
    })
  })
})
