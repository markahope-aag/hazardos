import { z } from 'zod'

/**
 * Validation for the per-organization "activity outcome" vocabulary — how a
 * step turned out. `halts_chain` models MarketSharp's "Done (doesn't add
 * activity process)" as a flag instead of a magic name. See
 * supabase/migrations/20260814000002_activity_model.sql.
 */

export const createActivityOutcomeSchema = z.object({
  name: z.string().min(1, 'Give it a name').max(120),
  halts_chain: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

export const updateActivityOutcomeSchema = createActivityOutcomeSchema.partial()

export type CreateActivityOutcomeInput = z.infer<typeof createActivityOutcomeSchema>
export type UpdateActivityOutcomeInput = z.infer<typeof updateActivityOutcomeSchema>
