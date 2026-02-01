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

// Commission type
export const commissionTypeSchema = z.enum(['percentage', 'flat', 'tiered'])
export const commissionAppliesToSchema = z.enum(['won', 'invoiced', 'paid'])

// Commission tier
export const commissionTierSchema = z.object({
  min: z.number().min(0),
  max: z.number().nullable(),
  rate: z.number().min(0),
})

// Commission plan
export const createCommissionPlanSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  commission_type: commissionTypeSchema,
  base_rate: z.number().min(0).optional().nullable(),
  tiers: z.array(commissionTierSchema).optional().nullable(),
  applies_to: commissionAppliesToSchema.optional(),
})

export const updateCommissionPlanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  commission_type: commissionTypeSchema.optional(),
  base_rate: z.number().min(0).optional().nullable(),
  tiers: z.array(commissionTierSchema).optional().nullable(),
  applies_to: commissionAppliesToSchema.optional(),
  is_active: z.boolean().optional(),
})

// Summary query
export const commissionSummaryQuerySchema = z.object({
  user_id: z.string().uuid().optional(),
}).passthrough()

// Export types
export type CreateCommissionInput = z.infer<typeof createCommissionSchema>
export type CommissionStatus = z.infer<typeof commissionStatusSchema>
