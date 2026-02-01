import { z } from 'zod'

// Activity entity types
export const activityEntityTypeSchema = z.enum([
  'customer',
  'job',
  'estimate',
  'invoice',
  'proposal',
  'opportunity',
])

// Manual activity type (note or call)
export const manualActivityTypeSchema = z.enum(['note', 'call'])

// Call direction
export const callDirectionSchema = z.enum(['inbound', 'outbound'])

// Manual activity schema
export const createManualActivitySchema = z.object({
  type: manualActivityTypeSchema,
  entity_type: activityEntityTypeSchema,
  entity_id: z.string().uuid('Invalid entity ID'),
  entity_name: z.string().max(255).optional(),
  content: z.string().max(5000).optional(),
  call_direction: callDirectionSchema.optional(),
  call_duration: z.number().int().min(0).optional(),
}).refine(
  (data) => {
    if (data.type === 'note') {
      return !!data.content
    }
    if (data.type === 'call') {
      return !!data.call_direction
    }
    return true
  },
  {
    message: 'Note requires content, call requires call_direction',
  }
)

// Activity list query
export const activityListQuerySchema = z.object({
  entity_type: activityEntityTypeSchema.optional(),
  entity_id: z.string().uuid().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
}).passthrough()

// Export types
export type ManualActivityInput = z.infer<typeof createManualActivitySchema>
export type ActivityEntityType = z.infer<typeof activityEntityTypeSchema>
