import { z } from 'zod'

// Cancel subscription
export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(1000).optional(),
  cancel_immediately: z.boolean().optional().default(false),
})

// Checkout session
export const createCheckoutSchema = z.object({
  plan_slug: z.string().min(1, 'Plan slug is required'),
  billing_cycle: z.enum(['monthly', 'yearly']).optional().default('monthly'),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
})

// Portal session
export const createPortalSchema = z.object({
  return_url: z.string().url().optional(),
})

// Update subscription
export const updateSubscriptionSchema = z.object({
  price_id: z.string().min(1, 'Price ID is required'),
})

// Export types
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>
