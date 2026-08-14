import { createAdminClient } from '@/lib/supabase/admin'
import { createServiceLogger, formatError } from '@/lib/utils/logger'
import { selectProcessesToRun, type ProcessEvent, type ProcessRule } from './activity-process-rules'
import {
  buildProcessWorkRows,
  type ProcessRow,
  type ProcessStepRow,
  type RecipientContext,
  type RunContext,
} from './activity-process-runner'
import type { FollowUpEntityType } from '@/types/follow-ups'

const log = createServiceLogger('process-event-drain')

// One batch per run. Large enough that a normal day never backs up, small
// enough that a bad configuration cannot burn a whole cron invocation before
// anyone notices in the run log.
const BATCH_SIZE = 200

// A row that has failed this many times is left alone. Retrying forever turns
// one broken chain into a permanent error in every cron run, which is how real
// failures get ignored.
const MAX_ATTEMPTS = 3

interface QueueRow {
  id: string
  organization_id: string
  event_type: string
  entity_type: string
  entity_id: string
  payload: Record<string, string | null> | null
  actor_id: string | null
  attempts: number
}

/**
 * Drains queued events into work.
 *
 * Runs from cron with no session, so everything here uses the admin client and
 * carries its organization explicitly. The cookie client would see nothing:
 * get_user_organization_id() is null outside a session, so every org-scoped
 * policy matches zero rows and the drain would report success having done
 * nothing. That exact failure has already happened once in this codebase, with
 * reminders.
 */
export async function processQueuedEvents(): Promise<{
  processed: number
  failed: number
  workCreated: number
}> {
  const supabase = createAdminClient()

  const { data: rows, error } = await supabase
    .from('process_event_queue')
    .select('id, organization_id, event_type, entity_type, entity_id, payload, actor_id, attempts')
    .eq('status', 'pending')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    log.error({ error: formatError(error, 'EVENT_DRAIN_READ') }, 'Could not read the event queue')
    throw error
  }

  let processed = 0
  let failed = 0
  let workCreated = 0

  for (const row of (rows ?? []) as QueueRow[]) {
    try {
      const created = await handleQueuedEvent(supabase, row)
      workCreated += created
      await supabase
        .from('process_event_queue')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', row.id)
      processed++
    } catch (err) {
      failed++
      const attempts = row.attempts + 1
      await supabase
        .from('process_event_queue')
        .update({
          attempts,
          // Only give up once the retries are exhausted, so a transient
          // failure gets another run rather than being buried.
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          error: err instanceof Error ? err.message.slice(0, 500) : 'Unknown error',
        })
        .eq('id', row.id)

      log.error(
        {
          error: formatError(err, 'EVENT_DRAIN_ITEM'),
          queueRowId: row.id,
          eventType: row.event_type,
          attempts,
        },
        'Queued event could not be processed'
      )
    }
  }

  return { processed, failed, workCreated }
}

async function handleQueuedEvent(
  supabase: ReturnType<typeof createAdminClient>,
  row: QueueRow
): Promise<number> {
  const payload = row.payload ?? {}

  const event: ProcessEvent = {
    type: row.event_type as ProcessEvent['type'],
    pipelineStageId: payload.pipeline_stage_id ?? null,
    jobStatus: payload.job_status ?? null,
    labResult: (payload.lab_result as 'positive' | 'negative' | null) ?? null,
    messageChannel: (payload.message_channel as 'email' | 'sms' | null) ?? null,
    contactType: await resolveSegment(supabase, row),
  }

  const { data: rules, error: rulesError } = await supabase
    .from('activity_process_rules')
    .select('id, event_type, activity_type_id, outcome_id, pipeline_stage_id, job_status, lab_result, message_channel, contact_type, process_id, is_active, sort_order')
    .eq('organization_id', row.organization_id)
    .eq('event_type', row.event_type)
    .eq('is_active', true)

  if (rulesError) throw rulesError

  const processIds = selectProcessesToRun((rules ?? []) as ProcessRule[], event)
  if (processIds.length === 0) return 0

  const context: RunContext = {
    organizationId: row.organization_id,
    entityType: row.entity_type as FollowUpEntityType,
    entityId: row.entity_id,
    // The moment the change happened is close enough to now at cron cadence,
    // and using now keeps a step due "immediately" from being created already
    // overdue.
    firedAt: new Date(),
    // Null when a cron or webhook caused the change. The runner treats that as
    // unassigned rather than dropping the step.
    actingUserId: row.actor_id,
  }

  let created = 0
  for (const processId of processIds) {
    created += await runProcessWithAdmin(supabase, processId, context)
  }
  return created
}

/** Segment filter, for rules that narrow to residential or commercial. */
async function resolveSegment(
  supabase: ReturnType<typeof createAdminClient>,
  row: QueueRow
): Promise<'residential' | 'commercial' | null> {
  const customerId = await resolveCustomerId(supabase, row)
  if (!customerId) return null

  const { data } = await supabase
    .from('customers')
    .select('contact_type')
    .eq('id', customerId)
    .maybeSingle()

  const value = data?.contact_type
  return value === 'residential' || value === 'commercial' ? value : null
}

const CUSTOMER_SOURCE: Record<string, string> = {
  job: 'jobs',
  opportunity: 'opportunities',
  estimate: 'estimates',
  invoice: 'invoices',
  site_survey: 'site_surveys',
  proposal: 'proposals',
}

async function resolveCustomerId(
  supabase: ReturnType<typeof createAdminClient>,
  row: QueueRow
): Promise<string | null> {
  if (row.entity_type === 'customer' || row.entity_type === 'contact') return row.entity_id
  const table = CUSTOMER_SOURCE[row.entity_type]
  if (!table) return null
  const { data } = await supabase
    .from(table)
    .select('customer_id')
    .eq('id', row.entity_id)
    .maybeSingle()
  return (data as { customer_id?: string } | null)?.customer_id ?? null
}

/**
 * The admin-client twin of runProcess.
 *
 * runProcess uses the session client and the create_activity_process_work RPC,
 * which checks the caller's organization. Neither works without a session, so
 * the drain inserts directly. Safe here because the organization comes from the
 * queue row a database trigger wrote, not from user input.
 */
async function runProcessWithAdmin(
  supabase: ReturnType<typeof createAdminClient>,
  processId: string,
  context: RunContext
): Promise<number> {
  const { data: process } = await supabase
    .from('activity_processes')
    .select('id, name, use_saturdays, use_sundays, is_active')
    .eq('id', processId)
    .eq('organization_id', context.organizationId)
    .maybeSingle()

  if (!process || !process.is_active) return 0

  // Same guard as the session path: a retried cron run or a second trigger on
  // the same record must not create the work twice.
  const { count } = await supabase
    .from('follow_ups')
    .select('id', { count: 'exact', head: true })
    .eq('process_id', processId)
    .eq('entity_type', context.entityType)
    .eq('entity_id', context.entityId)
    .is('completed_at', null)
    .is('canceled_at', null)

  if ((count ?? 0) > 0) return 0

  const { data: steps } = await supabase
    .from('activity_process_steps')
    .select('id, sort_order, kind, activity_type_id, note, assignee_mode, assigned_to, due_mode, due_days, due_time, due_hours, due_minutes, reminder_minutes, email_template_id, sms_template_id')
    .eq('process_id', processId)
    .order('sort_order', { ascending: true })

  if (!steps || steps.length === 0) return 0

  const recipient = await resolveRecipientWithAdmin(supabase, context)

  const rows = buildProcessWorkRows(
    process as ProcessRow,
    steps as ProcessStepRow[],
    context,
    recipient
  )

  for (const row of rows) {
    const { data: created, error } = await supabase
      .from('follow_ups')
      .insert({
        organization_id: context.organizationId,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        due_date: row.due_date,
        note: row.note,
        assigned_to: row.assigned_to,
        kind: row.kind,
        activity_type_id: row.activity_type_id,
        reminder_minutes: row.reminder_minutes,
        source: 'process',
        process_id: row.process_id,
        process_step_id: row.process_step_id,
      })
      .select('id')
      .single()

    if (error) throw error

    if (row.reminder && created) {
      const { error: reminderError } = await supabase.from('scheduled_reminders').insert({
        organization_id: context.organizationId,
        related_type: row.reminder.related_type,
        related_id: row.reminder.related_id,
        reminder_type: 'activity_process',
        recipient_type: 'customer',
        recipient_email: row.reminder.recipient_email,
        recipient_phone: row.reminder.recipient_phone,
        channel: row.reminder.channel,
        scheduled_for: row.reminder.scheduled_for,
        status: 'pending',
        template_variables: row.reminder.template_variables,
        email_template_id: row.reminder.email_template_id,
        sms_template_id: row.reminder.sms_template_id,
        follow_up_id: created.id,
      })
      if (reminderError) throw reminderError
    }
  }

  return rows.length
}

async function resolveRecipientWithAdmin(
  supabase: ReturnType<typeof createAdminClient>,
  context: RunContext
): Promise<RecipientContext | null> {
  const customerId = await resolveCustomerId(supabase, {
    entity_type: context.entityType,
    entity_id: context.entityId,
  } as QueueRow)

  if (!customerId) return null

  const { data: customer } = await supabase
    .from('customers')
    .select('name, first_name, company_name, email, phone, city')
    .eq('id', customerId)
    .maybeSingle()

  if (!customer) return null

  return {
    email: customer.email ?? null,
    phone: customer.phone ?? null,
    variables: {
      customer_name: customer.first_name || customer.name || 'there',
      customer_full_name: customer.name || '',
      company_name: customer.company_name || '',
      city: customer.city || '',
    },
  }
}
