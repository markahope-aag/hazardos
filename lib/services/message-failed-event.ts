import { createAdminClient } from '@/lib/supabase/admin'
import { createServiceLogger, formatError } from '@/lib/utils/logger'

const log = createServiceLogger('message-failed-event')

/**
 * Raises `message_failed` onto the process event queue.
 *
 * The rule type and trigger-editor option for this event have existed since
 * the automation engine shipped, but nothing ever inserted a row for it — a
 * chain built on "message failed" could be configured and would silently
 * never run. This is the one function every failure path (send-time throw,
 * Resend bounce webhook, Twilio failed/undelivered webhook) calls so there is
 * a single place that decides how a failed message becomes an event.
 *
 * Takes the same shape a database trigger would insert (see
 * queue_job_status_event and friends in
 * 20260814000010_process_event_queue.sql) because every other event on this
 * queue is raised that way; the drain cron doesn't distinguish origin.
 *
 * Silently skipped when there's no entity to attach the event to (some
 * reminders, e.g. a bare template-lookup failure, aren't tied to a job or
 * invoice) — same rule the lab-result trigger applies when there's no
 * customer_id to hang a chain off of.
 *
 * Errors inserting are logged and swallowed: a broken automation queue must
 * never take down the send/webhook path that reports delivery status.
 */
export async function queueMessageFailedEvent(params: {
  organizationId: string
  entityType: string | null
  entityId: string | null
  channel: 'email' | 'sms'
}): Promise<void> {
  const { organizationId, entityType, entityId, channel } = params
  if (!entityType || !entityId) return

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('process_event_queue').insert({
      organization_id: organizationId,
      event_type: 'message_failed',
      entity_type: entityType,
      entity_id: entityId,
      payload: { message_channel: channel },
    })
    if (error) throw error
  } catch (err) {
    log.error(
      { error: formatError(err, 'MESSAGE_FAILED_EVENT_QUEUE'), organizationId, entityType, entityId, channel },
      'Could not queue message_failed event'
    )
  }
}
