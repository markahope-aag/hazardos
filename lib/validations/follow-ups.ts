import { z } from 'zod'

export const followUpEntityTypeSchema = z.enum([
  'estimate',
  'job',
  'opportunity',
  'customer',
  'contact',
  'site_survey',
  'invoice',
  'proposal',
])

export const createFollowUpSchema = z.object({
  entity_type: followUpEntityTypeSchema,
  entity_id: z.string().uuid('Invalid entity ID'),
  due_date: z.string().datetime({ message: 'due_date must be an ISO timestamp' }),
  note: z.string().max(2000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
})

export const updateFollowUpSchema = z.object({
  due_date: z.string().datetime().optional(),
  note: z.string().max(2000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  completed: z.boolean().optional(),
})

export const followUpListQuerySchema = z.object({
  entity_type: followUpEntityTypeSchema.optional(),
  entity_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  // 'pending' (default), 'completed', or 'all'
  state: z.enum(['pending', 'completed', 'all']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>
export type FollowUpListQuery = z.infer<typeof followUpListQuerySchema>
