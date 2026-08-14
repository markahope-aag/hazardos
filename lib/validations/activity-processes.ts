import { z } from 'zod'

/**
 * Validation for automation chains and their steps.
 *
 * Mirrors the CHECK constraints in migration 20260814000003 rather than
 * trusting them to be the only guard. The database catching a bad step is
 * correct but produces a constraint violation; catching it here produces a
 * message an office manager can act on.
 */

export const activityKindSchema = z.enum(['call', 'email', 'text', 'todo'])
export const assigneeModeSchema = z.enum(['user', 'unassigned', 'current_user'])
export const dueModeSchema = z.enum(['immediate', 'days_at_time', 'days_hours_minutes'])

const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Use a 24-hour time like 08:30')

export const createProcessSchema = z.object({
  name: z.string().min(1, 'Give the chain a name').max(120),
  description: z.string().max(1000).optional().nullable(),
  is_active: z.boolean().optional(),
  use_saturdays: z.boolean().optional(),
  use_sundays: z.boolean().optional(),
})

export const updateProcessSchema = createProcessSchema.partial()

const stepFields = {
  kind: activityKindSchema,
  activity_type_id: z.string().uuid().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  assignee_mode: assigneeModeSchema.optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_mode: dueModeSchema.optional(),
  // Ten years is the same ceiling the database enforces. A chain running
  // longer than that is a typo, and one caught here says so plainly.
  due_days: z.number().int().min(0).max(3650).optional(),
  due_time: clockTime.optional().nullable(),
  due_hours: z.number().int().min(0).max(23).optional(),
  due_minutes: z.number().int().min(0).max(59).optional(),
  reminder_minutes: z.number().int().min(0).max(43200).optional().nullable(),
  email_template_id: z.string().uuid().optional().nullable(),
  sms_template_id: z.string().uuid().optional().nullable(),
}

/**
 * The three rules the database also enforces, checked here so the message
 * names the field rather than reporting a constraint violation.
 *
 * Written against a loose shape so the same checks apply to both the create
 * schema and its partial counterpart, where every field is optional.
 */
interface StepShape {
  assignee_mode?: 'user' | 'unassigned' | 'current_user'
  assigned_to?: string | null
  due_mode?: 'immediate' | 'days_at_time' | 'days_hours_minutes'
  due_time?: string | null
}

function checkStep(value: StepShape, ctx: z.RefinementCtx): void {
  if (value.assignee_mode === 'user' && !value.assigned_to) {
    ctx.addIssue({
      code: 'custom',
      message: 'Choose who this step is assigned to',
      path: ['assigned_to'],
    })
  }

  if (value.assignee_mode !== undefined && value.assignee_mode !== 'user' && value.assigned_to) {
    ctx.addIssue({
      code: 'custom',
      message: 'Only a step assigned to a specific person can name one',
      path: ['assigned_to'],
    })
  }

  if (value.due_mode === 'days_at_time' && !value.due_time) {
    ctx.addIssue({
      code: 'custom',
      message: 'Choose a time of day for this step',
      path: ['due_time'],
    })
  }
}

export const createStepSchema = z.object(stepFields).superRefine(checkStep)

export const updateStepSchema = z.object(stepFields).partial().superRefine(checkStep)

/**
 * Reordering sends the whole ordered list rather than a pair of indices, so a
 * client that has drifted cannot produce a half-applied order.
 */
export const reorderStepsSchema = z.object({
  step_ids: z.array(z.string().uuid()).min(1),
})

export type CreateProcessInput = z.infer<typeof createProcessSchema>
export type UpdateProcessInput = z.infer<typeof updateProcessSchema>
export type CreateStepInput = z.infer<typeof createStepSchema>
export type UpdateStepInput = z.infer<typeof updateStepSchema>
