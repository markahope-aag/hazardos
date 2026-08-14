import { createClient } from '@/lib/supabase/server'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import { logger, formatError } from '@/lib/utils/logger'
import { computeStepDueDate, type StepDueRule, type WorkingDayRules } from './activity-process-scheduler'
import { selectProcessesToRun, type ProcessEvent, type ProcessRule } from './activity-process-rules'
import type { FollowUpEntityType } from '@/types/follow-ups'

/**
 * Firing a chain: something happened, work appears.
 *
 * The two halves of the decision live elsewhere and are unit tested.
 * `activity-process-rules` decides which chains apply, `activity-process-
 * scheduler` decides when each step falls due. This joins them to the database
 * and is deliberately thin.
 *
 * A chain writes all of its steps at once rather than advancing one at a time.
 * That is how MarketSharp behaves, and it is why their process definitions were
 * recoverable from their data at all. It also means there is no run state to
 * keep: the work items are the running chain.
 */

export interface ProcessStepRow {
  id: string
  sort_order: number
  kind: string
  activity_type_id: string | null
  note: string | null
  assignee_mode: string
  assigned_to: string | null
  due_mode: string
  due_days: number
  due_time: string | null
  due_hours: number
  due_minutes: number
  reminder_minutes: number | null
}

export interface ProcessRow {
  id: string
  name: string
  use_saturdays: boolean
  use_sundays: boolean
  is_active: boolean
}

export interface RunContext {
  organizationId: string
  entityType: FollowUpEntityType
  entityId: string
  /** When the triggering event happened. Every due date is relative to this. */
  firedAt: Date
  /** Who caused it, for steps assigned to `current_user`. */
  actingUserId: string | null
}

/** Shape the `create_activity_process_work` RPC expects. */
export interface WorkItemPayload {
  entity_type: string
  entity_id: string
  due_date: string
  note: string | null
  assigned_to: string | null
  kind: string
  activity_type_id: string | null
  reminder_minutes: number | null
  process_id: string
  process_step_id: string
}

/**
 * Resolves who a step lands on.
 *
 * `current_user` falling back to unassigned matters: a chain fired by a webhook
 * or a cron has no acting user, and dropping the work entirely would be worse
 * than leaving it for someone to pick up.
 */
function resolveAssignee(step: ProcessStepRow, actingUserId: string | null): string | null {
  switch (step.assignee_mode) {
    case 'user':
      return step.assigned_to
    case 'current_user':
      return actingUserId
    case 'unassigned':
    default:
      return null
  }
}

/**
 * Turns a process definition into the work items it produces. Pure, so the
 * shape of a fired chain can be asserted without a database.
 */
export function buildProcessWorkRows(
  process: ProcessRow,
  steps: ProcessStepRow[],
  context: RunContext,
): WorkItemPayload[] {
  const dayRules: WorkingDayRules = {
    use_saturdays: process.use_saturdays,
    use_sundays: process.use_sundays,
  }

  return [...steps]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((step) => {
      const rule: StepDueRule = {
        due_mode: step.due_mode as StepDueRule['due_mode'],
        due_days: step.due_days,
        due_time: step.due_time,
        due_hours: step.due_hours,
        due_minutes: step.due_minutes,
      }
      const dueDate = computeStepDueDate(rule, context.firedAt, dayRules)

      return {
        entity_type: context.entityType,
        entity_id: context.entityId,
        due_date: dueDate.toISOString(),
        note: step.note,
        assigned_to: resolveAssignee(step, context.actingUserId),
        kind: step.kind,
        activity_type_id: step.activity_type_id,
        reminder_minutes: step.reminder_minutes,
        process_id: process.id,
        process_step_id: step.id,
      }
    })
}

/**
 * Runs one named process against one record.
 *
 * `skipIfOpen` guards against firing the same chain twice on the same record,
 * which a double-clicked button or a retried webhook would otherwise do. It is
 * on by default because duplicate work is invisible until someone notices they
 * are calling a customer twice.
 */
export async function runProcess(
  processId: string,
  context: RunContext,
  options: { skipIfOpen?: boolean } = {},
): Promise<{ created: number; skipped: boolean }> {
  const skipIfOpen = options.skipIfOpen ?? true
  const supabase = await createClient()

  const { data: process, error: processError } = await supabase
    .from('activity_processes')
    .select('id, name, use_saturdays, use_sundays, is_active')
    .eq('id', processId)
    .maybeSingle()

  if (processError) throwDbError(processError, 'load activity process')
  if (!process || !process.is_active) return { created: 0, skipped: true }

  if (skipIfOpen) {
    const { count, error: openError } = await supabase
      .from('follow_ups')
      .select('id', { count: 'exact', head: true })
      .eq('process_id', processId)
      .eq('entity_type', context.entityType)
      .eq('entity_id', context.entityId)
      .is('completed_at', null)

    if (openError) throwDbError(openError, 'check for an already-running process')
    if ((count ?? 0) > 0) {
      logger.info(
        { processId, entityType: context.entityType, entityId: context.entityId },
        'Process already running on this record, not firing again'
      )
      return { created: 0, skipped: true }
    }
  }

  const { data: steps, error: stepsError } = await supabase
    .from('activity_process_steps')
    .select('id, sort_order, kind, activity_type_id, note, assignee_mode, assigned_to, due_mode, due_days, due_time, due_hours, due_minutes, reminder_minutes')
    .eq('process_id', processId)
    .order('sort_order', { ascending: true })

  if (stepsError) throwDbError(stepsError, 'load activity process steps')
  // A process with no steps is a configuration mistake rather than an error.
  // Firing it is a no-op, and saying so in the log beats failing a customer
  // action because someone left a chain empty.
  if (!steps || steps.length === 0) {
    logger.warn({ processId, name: process.name }, 'Activity process has no steps')
    return { created: 0, skipped: true }
  }

  const rows = buildProcessWorkRows(
    process as ProcessRow,
    steps as ProcessStepRow[],
    context,
  )

  const { data: created, error: rpcError } = await supabase.rpc('create_activity_process_work', {
    p_organization_id: context.organizationId,
    p_rows: rows,
  })

  if (rpcError) throwDbError(rpcError, 'create activity process work')

  return { created: Array.isArray(created) ? created.length : rows.length, skipped: false }
}

/**
 * The entry point: an event happened, run whatever it triggers.
 *
 * Failures are logged and swallowed per process rather than propagated. A chain
 * that cannot fire must not fail the action that triggered it: if marking a job
 * complete throws because a follow-up chain is misconfigured, the user loses
 * their work for a reason they cannot act on.
 */
export async function handleProcessEvent(
  event: ProcessEvent,
  context: RunContext,
): Promise<{ ran: string[]; failed: string[] }> {
  const supabase = await createClient()

  const { data: rules, error } = await supabase
    .from('activity_process_rules')
    .select('id, event_type, activity_type_id, outcome_id, pipeline_stage_id, job_status, lab_result, message_channel, contact_type, process_id, is_active, sort_order')
    .eq('organization_id', context.organizationId)
    .eq('event_type', event.type)
    .eq('is_active', true)

  if (error) throwDbError(error, 'load activity process rules')

  const processIds = selectProcessesToRun((rules ?? []) as ProcessRule[], event)
  const ran: string[] = []
  const failed: string[] = []

  for (const processId of processIds) {
    try {
      const result = await runProcess(processId, context)
      if (!result.skipped) ran.push(processId)
    } catch (err) {
      failed.push(processId)
      logger.error(
        {
          error: formatError(err, 'PROCESS_RUN_FAILED'),
          processId,
          eventType: event.type,
          entityType: context.entityType,
          entityId: context.entityId,
        },
        'Activity process failed to run'
      )
    }
  }

  return { ran, failed }
}
