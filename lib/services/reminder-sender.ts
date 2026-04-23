import { createClient } from '@/lib/supabase/server'
import { SmsService } from '@/lib/services/sms-service'
import { EmailService } from '@/lib/services/email/email-service'
import { createServiceLogger, formatError } from '@/lib/utils/logger'

const log = createServiceLogger('reminder-sender')

interface ReminderRow {
  id: string
  organization_id: string
  related_type: string | null
  related_id: string
  channel: string
  template_slug: string
  recipient_email: string | null
  recipient_phone: string | null
  template_variables: Record<string, string | null> | null
}

interface RenderedContent {
  subject: string
  text: string
  html: string
  sms: string
}

// Content is rendered here — NOT pulled from the `jobs` or `customers` tables
// at send time — because the caller already promised in `scheduleReminders`
// that `template_variables` contains only the customer-safe fields (name,
// date, time, address, job number). This keeps internal notes (access codes,
// staff notes, internal_notes, customer.notes) out of every outbound
// message by construction: there's no code path from those columns to here.
function renderTemplate(
  slug: string,
  vars: Record<string, string | null> | null,
  orgName: string,
): RenderedContent | null {
  const name = vars?.customer_name || 'there'
  const date = vars?.scheduled_date || ''
  const time = vars?.scheduled_time || ''
  const address = vars?.property_address || ''
  const jobNumber = vars?.job_number || ''

  const prettyDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''
  const prettyTime = time ? formatTime(time) : ''

  switch (slug) {
    case 'job_confirmation':
      return {
        subject: `Appointment confirmed — ${prettyDate}${prettyTime ? ` at ${prettyTime}` : ''}`,
        text: `Hi ${name},

This confirms your appointment with ${orgName}.

Date: ${prettyDate}${prettyTime ? `\nTime: ${prettyTime}` : ''}
Address: ${address}
Reference: ${jobNumber}

We'll send you a reminder the week of your appointment and again the morning of. If you need to reschedule, just reply to this email.

— ${orgName}`,
        html: `<p>Hi ${name},</p>
<p>This confirms your appointment with <strong>${orgName}</strong>.</p>
<p>
  <strong>Date:</strong> ${prettyDate}<br/>
  ${prettyTime ? `<strong>Time:</strong> ${prettyTime}<br/>` : ''}
  <strong>Address:</strong> ${address}<br/>
  <strong>Reference:</strong> ${jobNumber}
</p>
<p>We'll send you a reminder the week of your appointment and again the morning of. If you need to reschedule, just reply to this email.</p>
<p>— ${orgName}</p>`,
        sms: '',
      }

    case 'job_reminder_week':
      return {
        subject: '',
        text: '',
        html: '',
        sms: `Hi ${name}, ${orgName} here — just a reminder that we're scheduled for ${prettyDate}${prettyTime ? ` at ${prettyTime}` : ''} at ${address}. Reply STOP to opt out.`,
      }

    case 'job_reminder_day':
      return {
        subject: '',
        text: '',
        html: '',
        sms: `Hi ${name}, reminder from ${orgName}: we're scheduled for today${prettyTime ? ` at ${prettyTime}` : ''} at ${address}. Reply STOP to opt out.`,
      }

    case 'payment_reminder_pre_due':
    case 'payment_reminder_due':
    case 'payment_reminder_overdue': {
      const invoiceNumber = vars?.invoice_number || ''
      const amount = vars?.amount || ''
      const dueDate = vars?.due_date || ''
      const payUrl = vars?.pay_url || ''
      const prefix = slug === 'payment_reminder_overdue'
        ? `${orgName}: Invoice ${invoiceNumber} for ${amount} is past due (was due ${dueDate}).`
        : slug === 'payment_reminder_due'
          ? `${orgName}: Friendly reminder — invoice ${invoiceNumber} for ${amount} is due today.`
          : `${orgName}: Invoice ${invoiceNumber} for ${amount} is due ${dueDate}.`
      return {
        subject: '',
        text: '',
        html: '',
        sms: `${prefix}${payUrl ? ` Pay: ${payUrl}` : ''} Reply STOP to opt out.`,
      }
    }

    default:
      return null
  }
}

function formatTime(hhmmss: string): string {
  // hhmmss can arrive as "07:30" or "07:30:00" — handle both.
  const [hStr, mStr] = hhmmss.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr || '0', 10)
  if (Number.isNaN(h)) return ''
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = ((h + 11) % 12) + 1
  return `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`
}

export interface ReminderSendResult {
  sent: boolean
  skipped?: 'opted_out' | 'no_email' | 'no_phone' | 'unknown_template'
  error?: string
}

// Sends a single scheduled_reminders row. Idempotent only in the sense that
// a row already marked `sent` won't be touched; retries on failed rows are
// safe. Returns the result so the caller can aggregate for reporting.
export async function sendReminderRow(rowId: string): Promise<ReminderSendResult> {
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('scheduled_reminders')
    .select('id, organization_id, related_type, related_id, channel, template_slug, recipient_email, recipient_phone, template_variables, status')
    .eq('id', rowId)
    .single()

  if (error || !row) {
    return { sent: false, error: 'Reminder row not found' }
  }
  if (row.status !== 'pending') {
    return { sent: false, error: `Row status is ${row.status}` }
  }

  const reminderRow = row as ReminderRow & { status: string }

  // Grab the org name for template rendering. The email sender identity
  // is resolved inside EmailService (verified-domain or shared-domain
  // fallback) so we don't read org.email here anymore.
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', reminderRow.organization_id)
    .single()
  const orgName = org?.name || 'HazardOS'

  const content = renderTemplate(reminderRow.template_slug, reminderRow.template_variables, orgName)
  if (!content) {
    await markStatus(reminderRow.id, 'failed', `Unknown template: ${reminderRow.template_slug}`)
    return { sent: false, skipped: 'unknown_template' }
  }

  // Resolve the customer attached to the underlying job so we can check
  // their explicit opt-in for this channel.
  let customerId: string | null = null
  if (reminderRow.related_type === 'job') {
    const { data: job } = await supabase
      .from('jobs')
      .select('customer_id')
      .eq('id', reminderRow.related_id)
      .single()
    customerId = job?.customer_id ?? null
  }

  interface CustomerSubset {
    email: string | null
    phone: string | null
    opted_into_email: boolean | null
    sms_opt_in: boolean | null
  }
  let customer: CustomerSubset | null = null
  if (customerId) {
    const { data } = await supabase
      .from('customers')
      .select('email, phone, opted_into_email, sms_opt_in')
      .eq('id', customerId)
      .single()
    customer = (data as unknown as CustomerSubset) || null
  }

  try {
    if (reminderRow.channel === 'email') {
      const to = reminderRow.recipient_email || customer?.email
      if (!to) {
        await markStatus(reminderRow.id, 'cancelled', 'No recipient email on file')
        return { sent: false, skipped: 'no_email' }
      }
      if (customer && customer.opted_into_email === false) {
        await markStatus(reminderRow.id, 'cancelled', 'Customer has opted out of email')
        return { sent: false, skipped: 'opted_out' }
      }

      try {
        await EmailService.send(
          reminderRow.organization_id,
          {
            to,
            subject: content.subject,
            text: content.text,
            html: content.html,
            tags: ['reminder', reminderRow.template_slug],
            // Prefer the underlying job/entity when we have one — the
            // unified feed threads the reminder onto that entity's
            // timeline. Falls back to the customer for generic nudges.
            relatedEntity: reminderRow.related_type
              ? { type: reminderRow.related_type, id: reminderRow.related_id }
              : customerId
              ? { type: 'customer', id: customerId }
              : undefined,
          },
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await markStatus(reminderRow.id, 'failed', msg)
        return { sent: false, error: msg }
      }

      await markStatus(reminderRow.id, 'sent')
      return { sent: true }
    }

    if (reminderRow.channel === 'sms') {
      const to = reminderRow.recipient_phone || customer?.phone
      if (!to) {
        await markStatus(reminderRow.id, 'cancelled', 'No recipient phone on file')
        return { sent: false, skipped: 'no_phone' }
      }
      // SmsService.send already enforces sms_opt_in when a customer_id is
      // supplied — relay any opt-out as a cancellation instead of a hard
      // failure so we don't retry indefinitely.
      try {
        await SmsService.send(reminderRow.organization_id, {
          to,
          body: content.sms,
          message_type: 'appointment_reminder',
          customer_id: customerId || undefined,
          related_entity_type: 'job',
          related_entity_id: reminderRow.related_id,
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        // Matches "opt in", "opt-in", "opted in", "opted out", etc. — any
        // "opt(ed) in/out" phrasing SmsService might throw.
        if (/opt(ed)?[- _]?(in|out)/i.test(msg)) {
          await markStatus(reminderRow.id, 'cancelled', 'Customer has not opted into SMS')
          return { sent: false, skipped: 'opted_out' }
        }
        throw e
      }

      await markStatus(reminderRow.id, 'sent')
      return { sent: true }
    }

    await markStatus(reminderRow.id, 'failed', `Unknown channel: ${reminderRow.channel}`)
    return { sent: false, error: `Unknown channel: ${reminderRow.channel}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    log.error(
      { rowId: reminderRow.id, slug: reminderRow.template_slug, err: formatError(e) },
      'reminder send failed',
    )
    await markStatus(reminderRow.id, 'failed', msg)
    return { sent: false, error: msg }
  }
}

async function markStatus(id: string, status: 'sent' | 'failed' | 'cancelled', errorMessage?: string) {
  const supabase = await createClient()
  const updates: Record<string, unknown> = {
    status,
    ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
    ...(errorMessage ? { error_message: errorMessage } : {}),
  }
  await supabase.from('scheduled_reminders').update(updates).eq('id', id)
}

// Processes every scheduled_reminder row whose time has come. Exposed here
// (rather than inlined in the cron route) so both the hourly cron and
// ad-hoc "send the confirmation email right now" paths share the same logic.
export async function processDueReminders(): Promise<{ sent: number; failed: number; skipped: number }> {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('scheduled_reminders')
    .select('id')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(500)

  let sent = 0
  let failed = 0
  let skipped = 0
  for (const row of rows || []) {
    const result = await sendReminderRow(row.id)
    if (result.sent) sent++
    else if (result.skipped) skipped++
    else failed++
  }
  return { sent, failed, skipped }
}
