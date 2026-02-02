import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StripeService } from '@/lib/services/stripe-service'

// Mock Stripe - we'll spy on methods after initialization
const mockStripeInstance = {
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
  subscriptions: {
    cancel: vi.fn(),
    update: vi.fn(),
  },
}

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      customers = mockStripeInstance.customers
      checkout = mockStripeInstance.checkout
      billingPortal = mockStripeInstance.billingPortal
      subscriptions = mockStripeInstance.subscriptions
    }
  }
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
    warn: vi.fn(),
  })),
  formatError: vi.fn((error) => ({ message: String(error) })),
}))

import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

describe('StripeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

      mockStripeInstance.customers.create.mockResolvedValue({
        id: 'cus_new456',
      })

      const customerId = await StripeService.getOrCreateCustomer('org-456')

      expect(customerId).toBe('cus_new456')
      expect(mockStripeInstance.customers.create).toHaveBeenCalled()
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

      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session/abc123',
      })

      const sessionUrl = await StripeService.createCheckoutSession(
        'org-123',
        'pro',
        'monthly',
        'https://app.com/success',
        'https://app.com/cancel'
      )

      expect(sessionUrl).toBe('https://checkout.stripe.com/session/abc123')
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalled()
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

      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session/abc123',
      })

      await StripeService.createCheckoutSession(
        'org-123',
        'pro',
        'yearly',
        'https://app.com/success',
        'https://app.com/cancel'
      )

      const createCall = mockStripeInstance.checkout.sessions.create.mock.calls[0][0]
      expect(createCall.line_items[0].price).toBe('price_yearly_456')
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

      mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/session/xyz789',
      })

      const portalUrl = await StripeService.createBillingPortalSession(
        'org-123',
        'https://app.com/settings'
      )

      expect(portalUrl).toBe('https://billing.stripe.com/session/xyz789')
      expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith({
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

  describe('getSubscription', () => {
    it('should return organization subscription', async () => {
      const mockSubscription = {
        id: 'sub-1',
        organization_id: 'org-123',
        plan_id: 'plan-pro',
        status: 'active',
        plan: {
          id: 'plan-pro',
          name: 'Pro Plan',
          slug: 'pro',
        },
      }

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockSubscription,
                error: null,
              }),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const subscription = await StripeService.getSubscription('org-123')

      expect(subscription).toBeDefined()
      expect(subscription?.status).toBe('active')
    })

    it('should return null when no subscription found', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const subscription = await StripeService.getSubscription('org-123')

      expect(subscription).toBeNull()
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'organization_subscriptions') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { stripe_subscription_id: 'sub_123' },
                    error: null,
                  }),
                })),
              })),
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            }
          }
          return {}
        }),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      mockStripeInstance.subscriptions.update.mockResolvedValue({})

      await StripeService.cancelSubscription('org-123', 'User requested', false)

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(
        'sub_123',
        { cancel_at_period_end: true }
      )
    })

    it('should cancel subscription immediately when requested', async () => {
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'organization_subscriptions') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { stripe_subscription_id: 'sub_123' },
                    error: null,
                  }),
                })),
              })),
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            }
          }
          return {}
        }),
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      mockStripeInstance.subscriptions.cancel.mockResolvedValue({})

      await StripeService.cancelSubscription('org-123', 'User requested', true)

      expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith('sub_123')
    })
  })
})
