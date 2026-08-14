import { z } from 'zod'

/**
 * Validation for the rules that decide when a chain runs.
 *
 * Mirrors the CHECK constraints in migration 20260814000004. The database
 * rejecting a qualifier that belongs to another event type is correct, but the
 * message names a constraint. This one names the field.
 */

export const processEventTypeSchema = z.enum([
  'activity_completed',
  'opportunity_stage_changed',
  'job_status_changed',
  'lab_result_received',
  'message_failed',
])

export type ProcessEventTypeInput = z.infer<typeof processEventTypeSchema>

/** Which qualifiers each event type is allowed to carry. */
const QUALIFIERS_BY_EVENT: Record<ProcessEventTypeInput, readonly string[]> = {
  activity_completed: ['activity_type_id', 'outcome_id'],
  opportunity_stage_changed: ['pipeline_stage_id'],
  job_status_changed: ['job_status'],
  lab_result_received: ['lab_result'],
  message_failed: ['message_channel'],
}

const ALL_QUALIFIERS = [
  'activity_type_id',
  'outcome_id',
  'pipeline_stage_id',
  'job_status',
  'lab_result',
  'message_channel',
] as const

const baseFields = {
  name: z.string().max(120).optional().nullable(),
  event_type: processEventTypeSchema,
  activity_type_id: z.string().uuid().optional().nullable(),
  outcome_id: z.string().uuid().optional().nullable(),
  pipeline_stage_id: z.string().uuid().optional().nullable(),
  job_status: z.string().max(50).optional().nullable(),
  lab_result: z.enum(['positive', 'negative']).optional().nullable(),
  message_channel: z.enum(['email', 'sms']).optional().nullable(),
  // Segment applies to every event type, so it is not in QUALIFIERS_BY_EVENT.
  contact_type: z.enum(['residential', 'commercial']).optional().nullable(),
  process_id: z.string().uuid('Choose which automation to run'),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
}

/**
 * A qualifier belonging to a different event type is not a harmless extra
 * field. It makes the rule read as more specific than it behaves, so it is
 * rejected rather than ignored.
 */
function checkQualifiers(
  value: Record<string, unknown>,
  ctx: z.RefinementCtx,
): void {
  const eventType = value.event_type as ProcessEventTypeInput | undefined
  if (!eventType) return

  const allowed = QUALIFIERS_BY_EVENT[eventType]
  for (const field of ALL_QUALIFIERS) {
    if (allowed.includes(field)) continue
    if (value[field] !== undefined && value[field] !== null) {
      ctx.addIssue({
        code: 'custom',
        message: `This condition does not apply to the chosen trigger`,
        path: [field],
      })
    }
  }
}

export const createRuleSchema = z.object(baseFields).superRefine(checkQualifiers)

// event_type stays required on update: the qualifier check is meaningless
// without knowing which event the rule is for, and a client editing a rule
// already has it.
export const updateRuleSchema = z
  .object({ ...baseFields, process_id: baseFields.process_id.optional() })
  .superRefine(checkQualifiers)

export type CreateRuleInput = z.infer<typeof createRuleSchema>
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>
