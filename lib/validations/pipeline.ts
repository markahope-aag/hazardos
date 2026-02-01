import { z } from 'zod'

// Create opportunity
export const createOpportunitySchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  name: z.string().min(1, 'Name is required').max(255),
  stage_id: z.string().uuid('Invalid stage ID'),
  value: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  expected_close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  source: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  assigned_to: z.string().uuid().optional(),
})

// Update opportunity
export const updateOpportunitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  stage_id: z.string().uuid().optional(),
  value: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  expected_close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  source: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  assigned_to: z.string().uuid().optional(),
  status: z.enum(['open', 'won', 'lost']).optional(),
})

// Move opportunity to stage
export const moveOpportunitySchema = z.object({
  stage_id: z.string().uuid('Invalid stage ID'),
})

// Pipeline stage
export const createStageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  order: z.number().int().min(0),
  probability: z.number().min(0).max(100).optional(),
  color: z.string().max(20).optional(),
})

export const updateStageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  order: z.number().int().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  color: z.string().max(20).optional(),
})

// Export types
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>
