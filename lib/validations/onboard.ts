import { z } from 'zod'

// Organization data for onboarding
export const organizationDataSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  licenseNumber: z.string().max(100).optional(),
})

// Billing cycle
export const billingCycleSchema = z.enum(['monthly', 'yearly'])

// Complete onboarding schema
export const completeOnboardSchema = z.object({
  organization: organizationDataSchema,
  plan_id: z.string().uuid('Invalid plan ID'),
  billing_cycle: billingCycleSchema,
  start_trial: z.boolean().optional().default(true),
})

// Export types
export type OrganizationDataInput = z.infer<typeof organizationDataSchema>
export type CompleteOnboardInput = z.infer<typeof completeOnboardSchema>
