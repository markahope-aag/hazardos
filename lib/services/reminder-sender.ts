import { createAdminClient } from '@/lib/supabase/admin'
import { SmsService } from '@/lib/services/sms-service'
import { EmailService } from '@/lib/services/email/email-service'
import { assertWriteOk } from '@/lib/utils/db-write'
import { renderTemplateBody, renderTemplateHtml } from '@/lib/services/template-render'
import { createServiceLogger, formatError } from '@/lib/utils/logger'
import { queueMessageFailedEvent } from '@/lib/services/message-failed-event'

const log = createServiceLogger('reminder-sender')

// Every path here runs from the hourly cron, which carries no Supabase session.
// Under the cookie client, get_user_organization_id() is NULL, so the
// scheduled_reminders RLS policy matched zero rows: processDueReminders() read
// an empty list and reported "sent: 0" with no error, the cron logged status
// ok, and no reminder ever went out while every monitor stayed green. The admin
// client is mandatory here; rows are addressed by their own id, so there is no
// tenant-scoping to reintroduce.

interface ReminderRow {
  id: string
  organization_id: string
  related_type: string | null
  related_id: string
  channel: string
  template_slug: string | null
  recipient_email: string | null
  recipient_phone: string | null
  template_variables: Record<string, string | null> | null
  // Set instead of template_slug when the content is the tenant's own copy
  // rather than one of the built-in system messages.
  email_template_id: string | null
  sms_template_id: string | null
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

/**
 * Renders content from a template the customer's own staff wrote.
 *
 * Loaded by id at send time rather than snapshotted when the message was
 * queued, so an edit reaches messages already in the queue. That is the
 * behavior an office manager expects when she fixes a typo in a chain that
 * runs for a year.
 *
 * The organization check is defense in depth. Every path that writes these ids
 * is org-scoped already, but this runs on the admin client with RLS bypassed,
 * so a bad id would otherwise render one tenant's copy into another tenant's
 * message.
 */
async function renderTenantTemplate(
  supabase: ReturnType<typeof createAdminClient>,
  row: ReminderRow,
  orgName: string,
): Promise<RenderedContent | null> {
  const variables = {
    ...(row.template_variables ?? {}),
    // Always available, and cheap: the sender already loaded it.
    company_name: orgName,
  }

  if (row.email_template_id) {
    const { data: template } = await supabase
      .from('email_templates')
      .select('subject, body, is_active, organization_id')
      .eq('id', row.email_template_id)
      .maybeSingle()

    if (!template || !template.is_active) return null
    if (template.organization_id !== row.organization_id) {
      log.error(
        { rowId: row.id, templateId: row.email_template_id },
        'Email template belongs to a different organization, refusing to send'
      )
      return null
    }

    const text = renderTemplateBody(template.body, variables)
    return {
      subject: renderTemplateBody(template.subject, variables),
      text,
      html: renderTemplateHtml(template.body, variables),
      sms: text,
    }
  }

  const { data: template } = await supabase
    .from('sms_templates')
    .select('body, is_active, organization_id')
    .eq('id', row.sms_template_id!)
    .maybeSingle()

  if (!template || !template.is_active) return null
  if (template.organization_id !== row.organization_id) {
    log.error(
      { rowId: row.id, templateId: row.sms_template_id },
      'SMS template belongs to a different organization, refusing to send'
    )
    return null
  }

  const text = renderTemplateBody(template.body, variables)
  return { subject: '', text, html: '', sms: text }
}

/**
 * Finds the org's own copy of one of the six shipped-default messages.
 *
 * Returns null for an org that predates the 20260815000001 seed migration
 * (backfilled for every org that existed then, but a very old fixture in a
 * test DB might not have run it) or one that turned its copy off — either
 * way the caller falls back to the hardcoded content in renderTemplate().
 */
async function resolveSystemTemplateId(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId: string,
  slug: string,
  channel: 'email' | 'sms',
): Promise<string | null> {
  const table = channel === 'email' ? 'email_templates' : 'sms_templates'
  const { data } = await supabase
    .from(table)
    .select('id, is_active')
    .eq('organization_id', organizationId)
    .eq('slug', slug)
    .maybeSingle()

  return data?.is_active ? data.id : null
}

/**
 * Adds the pretty-printed date/time a template can drop in, alongside
 * whatever job-reminders-service or invoice-delivery-service already put in
 * template_variables.
 *
 * Kept out of the callers: neither service should need to know how a date
 * gets formatted, any more than a template author should have to write that
 * logic themselves. `scheduled_date`/`scheduled_time` are the only inputs —
 * absent on payment reminders, which is fine, since their templates don't
 * reference the derived keys.
 */
function withDerivedVariables(
  vars: Record<string, string | null> | null
): Record<string, string | null> {
  const merged = { ...(vars ?? {}) }
  if (merged.scheduled_date) {
    merged.scheduled_date_pretty = new Date(merged.scheduled_date + 'T00:00:00').toLocaleDateString(
      undefined,
      { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    )
  }
  merged.time_suffix = merged.scheduled_time ? ` at ${formatTime(merged.scheduled_time)}` : ''
  return merged
}

// Sends a single scheduled_reminders row. Idempotent only in the sense that
// a row already marked `sent` won't be touched; retries on failed rows are
// safe. Returns the result so the caller can aggregate for reporting.
export async function sendReminderRow(rowId: string): Promise<ReminderSendResult> {
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('scheduled_reminders')
    .select('id, organization_id, related_type, related_id, channel, template_slug, recipient_email, recipient_phone, template_variables, status, email_template_id, sms_template_id')
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

  // Tenant copy takes precedence when a step was built with one attached.
  // Otherwise a `template_slug` row resolves to the org's own (editable)
  // version of that built-in message when one has been seeded — see
  // resolveSystemTemplate — and only falls back to the hardcoded copy in
  // renderTemplate() for an org that predates the seed migration. Every path
  // renders only from `template_variables`; none reads a record at send
  // time, which is what keeps internal notes out of outbound mail (see the
  // note above renderTemplate).
  let content: RenderedContent | null
  let unknownTemplateLabel = `Unknown template: ${reminderRow.template_slug}`

  if (reminderRow.email_template_id || reminderRow.sms_template_id) {
    content = await renderTenantTemplate(supabase, reminderRow, orgName)
    unknownTemplateLabel = 'tenant template missing, inactive, or belongs to another organization'
  } else {
    const systemTemplateId =
      reminderRow.template_slug && (reminderRow.channel === 'email' || reminderRow.channel === 'sms')
        ? await resolveSystemTemplateId(
            supabase,
            reminderRow.organization_id,
            reminderRow.template_slug,
            reminderRow.channel,
          )
        : null

    if (systemTemplateId) {
      content = await renderTenantTemplate(
        supabase,
        {
          ...reminderRow,
          template_variables: withDerivedVariables(reminderRow.template_variables),
          email_template_id: reminderRow.channel === 'email' ? systemTemplateId : null,
          sms_template_id: reminderRow.channel === 'sms' ? systemTemplateId : null,
        },
        orgName,
      )
    } else {
      content = renderTemplate(reminderRow.template_slug ?? '', reminderRow.template_variables, orgName)
    }
  }

  if (!content) {
    await markStatus(reminderRow.id, 'failed', unknownTemplateLabel)
    await raiseMessageFailed(reminderRow)
    return { sent: false, skipped: 'unknown_template' }
  }

  // Resolve the customer attached to the underlying entity so we can check
  // their explicit opt-in for this channel. Invoice-related rows (payment
  // reminders) were previously skipped here entirely — customerId stayed
  // null, which meant SmsService.send()'s sms_opt_in check (gated on
  // customer_id being present) never ran, so a payment reminder could go
  // out over SMS to a customer who had explicitly NOT opted in.
  let customerId: string | null = null
  if (reminderRow.related_type === 'job') {
    const { data: job } = await supabase
      .from('jobs')
      .select('customer_id')
      .eq('id', reminderRow.related_id)
      .single()
    customerId = job?.customer_id ?? null
  } else if (reminderRow.related_type === 'invoice') {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('customer_id')
      .eq('id', reminderRow.related_id)
      .single()
    customerId = invoice?.customer_id ?? null
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
            // Tenant copy has no slug, so tag it as such rather than dropping
            // the tag: the distinction between a system message and a
            // customer's own template is exactly what you want when reading
            // delivery stats back.
            tags: ['reminder', reminderRow.template_slug ?? 'tenant-template'],
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
        await raiseMessageFailed(reminderRow)
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
          message_type: reminderRow.related_type === 'invoice' ? 'payment_reminder' : 'appointment_reminder',
          customer_id: customerId || undefined,
          related_entity_type: reminderRow.related_type || 'job',
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
    await raiseMessageFailed(reminderRow)
    return { sent: false, error: msg }
  }
}

/** Raises `message_failed` for a reminder row that just failed to send. */
async function raiseMessageFailed(row: ReminderRow) {
  if (row.channel !== 'email' && row.channel !== 'sms') return
  await queueMessageFailedEvent({
    organizationId: row.organization_id,
    entityType: row.related_type,
    entityId: row.related_id,
    channel: row.channel,
  })
}

async function markStatus(id: string, status: 'sent' | 'failed' | 'cancelled', errorMessage?: string) {
  const supabase = createAdminClient()
  const updates: Record<string, unknown> = {
    status,
    ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
    ...(errorMessage ? { error_message: errorMessage } : {}),
  }
  // Assert: if this update is silently dropped, a reminder that was actually
  // sent stays `pending` and processDueReminders re-sends it every hour —
  // duplicate customer messages, which is worse than a loud failure.
  assertWriteOk(
    await supabase.from('scheduled_reminders').update(updates).eq('id', id).select('id'),
    `markStatus(${id} -> ${status})`,
  )
}

// Processes every scheduled_reminder row whose time has come. Exposed here
// (rather than inlined in the cron route) so both the hourly cron and
// ad-hoc "send the confirmation email right now" paths share the same logic.
export async function processDueReminders(): Promise<{ sent: number; failed: number; skipped: number }> {
  const supabase = createAdminClient()
  const { data: rows, error } = await supabase
    .from('scheduled_reminders')
    .select('id')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(500)

  // Surface a failed read instead of returning "sent: 0". A swallowed error
  // here is exactly how a broken reminder pipeline reported healthy.
  if (error) {
    throw new Error(`processDueReminders: failed to load due reminders — ${error.message}`)
  }

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
