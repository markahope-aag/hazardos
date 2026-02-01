import { z } from 'zod'

// Approval entity type (matches ApprovalEntityType from types/sales.ts)
export const approvalEntityTypeSchema = z.enum([
  'estimate',
  'discount',
  'proposal',
  'change_order',
  'expense',
])

// Approval status
export const approvalStatusSchema = z.enum(['pending', 'approved', 'rejected'])

// Approval list query
export const approvalListQuerySchema = z.object({
  entity_type: approvalEntityTypeSchema.optional(),
  status: approvalStatusSchema.optional(),
  pending_only: z.string().optional(),
}).passthrough()

// Create approval request
export const createApprovalSchema = z.object({
  entity_type: approvalEntityTypeSchema,
  entity_id: z.string().uuid('Invalid entity ID'),
  amount: z.number().optional(),
  notes: z.string().max(1000).optional(),
})

// Process approval (approve/reject)
export const processApprovalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(1000).optional(),
})

// Export types
export type CreateApprovalInput = z.infer<typeof createApprovalSchema>
export type ApprovalEntityType = z.infer<typeof approvalEntityTypeSchema>
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>
