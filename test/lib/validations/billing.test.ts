import { describe, it, expect } from 'vitest'
import {
  cancelSubscriptionSchema,
  createCheckoutSchema,
  createPortalSchema,
  updateSubscriptionSchema,
} from '@/lib/validations/billing'

// `mustBeAppUrl` reads NEXT_PUBLIC_APP_URL at parse time, falling back to
// hazardos.app. Different envs (local empty, CI=localhost:3000) would
// otherwise reject our happy-path URLs — derive them from the same env so
// the tests pass everywhere.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hazardos.app'

describe('cancelSubscriptionSchema', () => {
  it('accepts valid cancellation', () => {
    const result = cancelSubscriptionSchema.safeParse({
      reason: 'Too expensive',
      cancel_immediately: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = cancelSubscriptionSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('defaults cancel_immediately to false', () => {
    const result = cancelSubscriptionSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cancel_immediately).toBe(false)
    }
  })

  it('rejects reason exceeding max length', () => {
    const result = cancelSubscriptionSchema.safeParse({
      reason: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})

describe('createCheckoutSchema', () => {
  const validCheckout = {
    plan_slug: 'pro',
    success_url: `${APP_URL}/success`,
    cancel_url: `${APP_URL}/cancel`,
  }

  it('accepts valid checkout', () => {
    const result = createCheckoutSchema.safeParse(validCheckout)
    expect(result.success).toBe(true)
  })

  it('requires plan_slug', () => {
    const result = createCheckoutSchema.safeParse({
      success_url: `${APP_URL}/success`,
      cancel_url: `${APP_URL}/cancel`,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty plan_slug', () => {
    const result = createCheckoutSchema.safeParse({
      plan_slug: '',
      success_url: `${APP_URL}/success`,
      cancel_url: `${APP_URL}/cancel`,
    })
    expect(result.success).toBe(false)
  })

  it('requires success_url', () => {
    const result = createCheckoutSchema.safeParse({
      plan_slug: 'pro',
      cancel_url: `${APP_URL}/cancel`,
    })
    expect(result.success).toBe(false)
  })

  it('requires cancel_url', () => {
    const result = createCheckoutSchema.safeParse({
      plan_slug: 'pro',
      success_url: `${APP_URL}/success`,
    })
    expect(result.success).toBe(false)
  })

  it('requires valid URL for success_url', () => {
    const result = createCheckoutSchema.safeParse({
      plan_slug: 'pro',
      success_url: 'not-a-url',
      cancel_url: `${APP_URL}/cancel`,
    })
    expect(result.success).toBe(false)
  })

  it('requires valid URL for cancel_url', () => {
    const result = createCheckoutSchema.safeParse({
      plan_slug: 'pro',
      success_url: `${APP_URL}/success`,
      cancel_url: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('defaults billing_cycle to monthly', () => {
    const result = createCheckoutSchema.safeParse(validCheckout)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.billing_cycle).toBe('monthly')
    }
  })

  it('accepts yearly billing_cycle', () => {
    const result = createCheckoutSchema.safeParse({
      ...validCheckout,
      billing_cycle: 'yearly',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.billing_cycle).toBe('yearly')
    }
  })

  it('rejects invalid billing_cycle', () => {
    const result = createCheckoutSchema.safeParse({
      ...validCheckout,
      billing_cycle: 'weekly',
    })
    expect(result.success).toBe(false)
  })
})

describe('createPortalSchema', () => {
  it('accepts valid portal request', () => {
    const result = createPortalSchema.safeParse({
      return_url: `${APP_URL}/settings`,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = createPortalSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('requires valid URL for return_url when provided', () => {
    const result = createPortalSchema.safeParse({
      return_url: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateSubscriptionSchema', () => {
  it('accepts valid update', () => {
    const result = updateSubscriptionSchema.safeParse({
      price_id: 'price_1234567890',
    })
    expect(result.success).toBe(true)
  })

  it('requires price_id', () => {
    const result = updateSubscriptionSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty price_id', () => {
    const result = updateSubscriptionSchema.safeParse({
      price_id: '',
    })
    expect(result.success).toBe(false)
  })
})
