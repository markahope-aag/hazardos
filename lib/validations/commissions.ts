import { z } from 'zod'

// Commission status
export const commissionStatusSchema = z.enum(['pending', 'approved', 'paid'])

// Commission list query
export const commissionListQuerySchema = z.object({
  user_id: z.string().uuid().optional(),
  status: commissionStatusSchema.optional(),
  pay_period: z.string().optional(),
}).passthrough()

// Create commission earning
export const createCommissionSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  plan_id: z.string().uuid('Invalid plan ID'),
  opportunity_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
  base_amount: z.number().min(0, 'Base amount must be non-negative'),
})

// Update commission
export const updateCommissionSchema = z.object({
  status: commissionStatusSchema.optional(),
  paid_at: z.string().datetime().optional(),
})

// Commission plan
export const createCommissionPlanSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  rate_percent: z.number().min(0).max(100),
  description: z.string().max(1000).optional(),
  is_active: z.boolean().optional().default(true),
})

export const updateCommissionPlanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  rate_percent: z.number().min(0).max(100).optional(),
  description: z.string().max(1000).optional(),
  is_active: z.boolean().optional(),
})

// Export types
export type CreateCommissionInput = z.infer<typeof createCommissionSchema>
export type CommissionStatus = z.infer<typeof commissionStatusSchema>
