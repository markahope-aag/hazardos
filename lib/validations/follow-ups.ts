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

export const activityKindSchema = z.enum(['call', 'email', 'text', 'todo'])

export const createFollowUpSchema = z.object({
  entity_type: followUpEntityTypeSchema,
  entity_id: z.string().uuid('Invalid entity ID'),
  due_date: z.string().datetime({ message: 'due_date must be an ISO timestamp' }),
  note: z.string().max(2000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  kind: activityKindSchema.optional(),
  activity_type_id: z.string().uuid().optional().nullable(),
  // Minutes before due_date. Capped at 30 days so a typo can't schedule a
  // reminder years out.
  reminder_minutes: z.number().int().min(0).max(43200).optional().nullable(),
})

export const updateFollowUpSchema = z.object({
  due_date: z.string().datetime().optional(),
  note: z.string().max(2000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  completed: z.boolean().optional(),
  kind: activityKindSchema.optional(),
  activity_type_id: z.string().uuid().optional().nullable(),
  // Why it ended the way it did. Set alongside `completed: true`.
  outcome_id: z.string().uuid().optional().nullable(),
  reminder_minutes: z.number().int().min(0).max(43200).optional().nullable(),
})

export const followUpListQuerySchema = z.object({
  entity_type: followUpEntityTypeSchema.optional(),
  entity_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  // 'pending' (default), 'completed', or 'all'
  state: z.enum(['pending', 'completed', 'all']).optional(),
  kind: activityKindSchema.optional(),
  // Date window on due_date, for "today", "this week" and overdue views.
  due_before: z.string().datetime().optional(),
  due_after: z.string().datetime().optional(),
  // Attach the entity each item hangs off, for the cross-entity queue. Off by
  // default because it costs one extra query per entity type present.
  include_entity: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>
export type FollowUpListQuery = z.infer<typeof followUpListQuerySchema>
