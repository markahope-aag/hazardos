import { z } from 'zod'

/**
 * Validation for the per-organization "activity type" vocabulary — the Call
 * Out / Email Out / Text Out / To-Do split MarketSharp calls Type, with the
 * tenant's own label as `name`. See supabase/migrations/20260814000002_activity_model.sql.
 */

export const ACTIVITY_TYPE_KINDS = ['call', 'email', 'text', 'todo'] as const

export const createActivityTypeSchema = z.object({
  name: z.string().min(1, 'Give it a name').max(120),
  kind: z.enum(ACTIVITY_TYPE_KINDS),
  is_active: z.boolean().optional(),
})

export const updateActivityTypeSchema = createActivityTypeSchema.partial()

export type CreateActivityTypeInput = z.infer<typeof createActivityTypeSchema>
export type UpdateActivityTypeInput = z.infer<typeof updateActivityTypeSchema>
