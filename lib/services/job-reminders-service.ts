import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createServiceLogger, formatError } from '@/lib/utils/logger'

const log = createServiceLogger('JobRemindersService')

/**
 * Customer-facing reminder cadence for a scheduled job:
 *   1. Confirmation email sent immediately on save
 *   2. Week-before SMS at 9am (if customer has phone)
 *   3. Day-of SMS at 7am (so they see it before the crew arrives)
 *
 * Templates are rendered only from customer-safe fields: name, scheduled
 * date/time, address, job number. No internal notes, access codes, or
 * other staff-facing fields ever enter this payload.
 *
 * Idempotent: cancels any pending rows for the job first so rescheduling
 * doesn't produce duplicates.
 */
export class JobRemindersService {
  static async schedule(jobId: string): Promise<void> {
    const supabase = await createClient()

    const job = await JobsService.getById(jobId)
    if (!job || !job.customer) return
    if (!job.scheduled_start_date) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', job.created_by)
      .single()

    if (!profile) return

    // Clear any previously pending reminders for this job so we don't end up
    // with stale rows after a reschedule.
    await supabase
      .from('scheduled_reminders')
      .update({ status: 'cancelled' })
      .eq('related_type', 'job')
      .eq('related_id', jobId)
      .eq('status', 'pending')

    const customer = job.customer
    const scheduledDate = new Date(job.scheduled_start_date)
    const now = new Date()

    const commonVars = {
      customer_name: customer.name || customer.company_name,
      scheduled_date: job.scheduled_start_date,
      scheduled_time: job.scheduled_start_time,
      property_address: job.job_address,
      job_number: job.job_number,
    }

    const rows: Array<Record<string, unknown>> = []

    // 1. Confirmation email — goes out on the next cron tick.
    if (customer.email) {
      rows.push({
        organization_id: profile.organization_id,
        related_type: 'job',
        related_id: jobId,
        reminder_type: 'job_confirmation',
        recipient_type: 'customer',
        recipient_email: customer.email,
        recipient_phone: customer.phone,
        channel: 'email',
        scheduled_for: now.toISOString(),
        template_slug: 'job_confirmation',
        template_variables: commonVars,
      })
    }

    // 2. Week-before SMS at 9am local-ish (server time).
    const weekBefore = new Date(scheduledDate)
    weekBefore.setDate(weekBefore.getDate() - 7)
    weekBefore.setHours(9, 0, 0, 0)
    if (weekBefore > now && customer.phone) {
      rows.push({
        organization_id: profile.organization_id,
        related_type: 'job',
        related_id: jobId,
        reminder_type: 'job_reminder_week',
        recipient_type: 'customer',
        recipient_email: customer.email,
        recipient_phone: customer.phone,
        channel: 'sms',
        scheduled_for: weekBefore.toISOString(),
        template_slug: 'job_reminder_week',
        template_variables: commonVars,
      })
    }

    // 3. Day-of SMS at 7am so the customer sees it before the crew arrives.
    const dayOf = new Date(scheduledDate)
    dayOf.setHours(7, 0, 0, 0)
    if (dayOf > now && customer.phone) {
      rows.push({
        organization_id: profile.organization_id,
        related_type: 'job',
        related_id: jobId,
        reminder_type: 'job_reminder_day',
        recipient_type: 'customer',
        recipient_email: customer.email,
        recipient_phone: customer.phone,
        channel: 'sms',
        scheduled_for: dayOf.toISOString(),
        template_slug: 'job_reminder_day',
        template_variables: commonVars,
      })
    }

    if (rows.length === 0) return

    const { data: inserted } = await supabase
      .from('scheduled_reminders')
      .insert(rows)
      .select('id, template_slug')

    // Fire the confirmation email synchronously so the customer gets it
    // now, not on the next hourly cron tick. Any failure is captured on
    // the row itself and will be picked up by the processor next tick.
    const confirmation = inserted?.find((r) => r.template_slug === 'job_confirmation')
    if (confirmation) {
      try {
        const { sendReminderRow } = await import('@/lib/services/reminder-sender')
        await sendReminderRow(confirmation.id)
      } catch (e) {
        log.warn(
          { jobId, rowId: confirmation.id, err: formatError(e) },
          'immediate confirmation send failed; cron will retry',
        )
      }
    }
  }

  static async cancel(jobId: string): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('scheduled_reminders')
      .update({ status: 'cancelled' })
      .eq('related_type', 'job')
      .eq('related_id', jobId)
      .eq('status', 'pending')
  }

  static async reschedule(jobId: string): Promise<void> {
    await JobRemindersService.cancel(jobId)
    await JobRemindersService.schedule(jobId)
  }
}
