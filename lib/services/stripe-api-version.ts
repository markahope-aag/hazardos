import type Stripe from 'stripe'

/**
 * The Stripe API version this application is written against.
 *
 * Deliberately pinned. The SDK's types track whatever version it shipped
 * against (20.4.1 wants 2026-02-25.clover), but the API version decides request
 * and response shapes, so moving it changes payment behavior. That is a
 * decision to make and test on purpose, not something to inherit from a
 * lockfile update. Stripe supports pinning an older version indefinitely; the
 * cast exists only because the typed field admits the SDK's own default alone.
 *
 * This lives in its own module rather than beside the service so that a test
 * mocking StripeService cannot accidentally remove it from the webhook route,
 * which needs the same version to read payloads the service wrote.
 */
export const STRIPE_API_VERSION =
  '2026-01-28.clover' as unknown as Stripe.StripeConfig['apiVersion']
