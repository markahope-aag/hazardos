import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/services/activity-service', () => ({
  Activity: { created: vi.fn(), sent: vi.fn(), statusChanged: vi.fn(), paid: vi.fn() },
}))
vi.mock('@/lib/services/email/email-service', () => ({
  EmailService: { send: vi.fn().mockResolvedValue({ auditId: 'a', providerMessageId: 'e' }) },
  resolveSender: vi.fn().mockResolvedValue({
    fromEmail: 'tenant@send.hazardos.app',
    fromName: 'Tenant',
    replyTo: null,
    usingVerifiedDomain: false,
  }),
}))
vi.mock('@/lib/services/email/template-wrapper', () => ({
  wrapEmailHtml: vi.fn().mockResolvedValue('<html><body>mock</body></html>'),
}))

import { createClient } from '@/lib/supabase/server'
import { InvoiceDeliveryService } from '@/lib/services/invoice-delivery-service'

/**
 * Payment reminder scheduling, which runs after an invoice is sent and decides
 * whether a customer gets billing texts, how many, and when.
 *
 * The existing suite covers the send itself but its fixture has no due date,
 * no phone and no opt-in, so scheduling exits at the first guard and none of
 * this was exercised. Three things here are worth protecting:
 *
 *   - the SMS consent gate, because texting someone who never opted in is a
 *     TCPA problem, not a bug report
 *   - the past-date skip, because scheduling a "3 days before due" reminder for
 *     an invoice due tomorrow means texting the customer about it immediately
 *   - the cancel-then-reschedule, because without it a resend doubles every
 *     reminder the customer receives
 */

const DAY = 24 * 60 * 60 * 1000
const dateIn = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10)

interface Options {
  dueDate?: string | null
  phone?: string | null
  smsOptIn?: boolean
  smsEnabled?: boolean
  remindersEnabled?: boolean
  hasSmsSettings?: boolean
}

function setup(options: Options = {}) {
  const {
    dueDate = dateIn(10),
    phone = '+15555550123',
    smsOptIn = true,
    smsEnabled = true,
    remindersEnabled = true,
    hasSmsSettings = true,
  } = options

  const customer = { email: 'billing@acme.test', phone, sms_opt_in: smsOptIn }
  const sentInvoice = {
    id: 'inv-1',
    invoice_number: 'INV-001',
    status: 'sent',
    sent_via: 'email',
    due_date: dueDate,
    balance_due: 2500,
    customer,
    line_items: [],
    payments: [],
  }

  const captured: {
    insertedReminders?: Array<Record<string, unknown>>
    cancelUpdates: Array<Record<string, unknown>>
  } = { cancelUpdates: [] }

  const mockSupabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    rpc: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { ...sentInvoice, status: 'draft' },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: sentInvoice, error: null }),
              })),
            })),
          })),
        }
      }
      if (table === 'profiles' || table === 'organizations') {
        const row = table === 'profiles' ? { organization_id: 'org-1' } : { name: 'Acme Abatement' }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: row, error: null }) })),
            single: vi.fn().mockResolvedValue({ data: row, error: null }),
          })),
        }
      }
      if (table === 'organization_sms_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: hasSmsSettings
                  ? { sms_enabled: smsEnabled, payment_reminders_enabled: remindersEnabled }
                  : null,
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'scheduled_reminders') {
        return {
          update: vi.fn((payload: Record<string, unknown>) => {
            captured.cancelUpdates.push(payload)
            const chain = { eq: vi.fn(() => chain), then: undefined }
            // .eq() is chained three times then awaited
            const thenable = {
              eq: vi.fn(() => thenable),
              then: (res: (v: unknown) => void) => res({ data: null, error: null }),
            }
            return thenable
          }),
          insert: vi.fn((rows: Array<Record<string, unknown>>) => {
            captured.insertedReminders = rows
            return Promise.resolve({ data: null, error: null })
          }),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn(() => ({ neq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
            then: (res: (v: unknown) => void) => res({ data: [], error: null }),
          })),
        })),
      }
    }),
  }

  vi.mocked(createClient).mockResolvedValue(mockSupabase as never)
  return { captured }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RESEND_API_KEY = 'test-api-key'
})

describe('payment reminders: consent and org settings', () => {
  it('schedules reminders for an opted-in customer with a phone', async () => {
    // CONTROL. Every "does not schedule" test below is meaningless unless
    // scheduling demonstrably happens under the right conditions.
    const { captured } = setup()
    await InvoiceDeliveryService.send('inv-1', 'email')
    expect(captured.insertedReminders?.length).toBeGreaterThan(0)
  })

  it('schedules nothing when the customer never opted into SMS', async () => {
    const { captured } = setup({ smsOptIn: false })
    await InvoiceDeliveryService.send('inv-1', 'email')
    expect(captured.insertedReminders).toBeUndefined()
  })

  it('schedules nothing when the customer has no phone number', async () => {
    const { captured } = setup({ phone: null })
    await InvoiceDeliveryService.send('inv-1', 'email')
    expect(captured.insertedReminders).toBeUndefined()
  })

  it('schedules nothing when the org has SMS switched off', async () => {
    const { captured } = setup({ smsEnabled: false })
    await InvoiceDeliveryService.send('inv-1', 'email')
    expect(captured.insertedReminders).toBeUndefined()
  })

  it('schedules nothing when payment reminders specifically are off', async () => {
    // A distinct toggle from sms_enabled: an org can use SMS for job updates
    // and still not want automated chasing about money.
    const { captured } = setup({ remindersEnabled: false })
    await InvoiceDeliveryService.send('inv-1', 'email')
    expect(captured.insertedReminders).toBeUndefined()
  })

  it('schedules nothing when the org has no SMS settings row at all', async () => {
    const { captured } = setup({ hasSmsSettings: false })
    await InvoiceDeliveryService.send('inv-1', 'email')
    expect(captured.insertedReminders).toBeUndefined()
  })

  it('schedules nothing when the invoice has no due date', async () => {
    const { captured } = setup({ dueDate: null })
    await InvoiceDeliveryService.send('inv-1', 'email')
    expect(captured.insertedReminders).toBeUndefined()
  })
})

describe('payment reminders: timing', () => {
  it('creates three reminders for an invoice due comfortably in the future', async () => {
    const { captured } = setup({ dueDate: dateIn(10) })
    await InvoiceDeliveryService.send('inv-1', 'email')

    const rows = captured.insertedReminders!
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.reminder_type)).toEqual([
      'payment_reminder_pre_due',
      'payment_reminder_due',
      'payment_reminder_overdue',
    ])
  })

  it('skips the pre-due reminder when the invoice is due tomorrow', async () => {
    // "3 days before due" is already in the past here. Without the skip the
    // customer is texted an early-payment nudge the moment the invoice is sent.
    const { captured } = setup({ dueDate: dateIn(1) })
    const rows = (await InvoiceDeliveryService.send('inv-1', 'email'), captured.insertedReminders!)

    expect(rows.map((r) => r.reminder_type)).toEqual([
      'payment_reminder_due',
      'payment_reminder_overdue',
    ])
  })

  it('inserts nothing at all for an already-overdue invoice', async () => {
    // All three dates are in the past, so there is nothing to schedule and no
    // empty insert should be issued.
    const { captured } = setup({ dueDate: dateIn(-10) })
    await InvoiceDeliveryService.send('inv-1', 'email')
    expect(captured.insertedReminders).toBeUndefined()
  })

  it('schedules every reminder at 10am local, not at send time', async () => {
    const { captured } = setup({ dueDate: dateIn(10) })
    await InvoiceDeliveryService.send('inv-1', 'email')

    for (const row of captured.insertedReminders!) {
      const when = new Date(row.scheduled_for as string)
      expect(when.getHours()).toBe(10)
      expect(when.getMinutes()).toBe(0)
    }
  })

  it('orders the reminders three days before, on, and three days after the due date', async () => {
    const { captured } = setup({ dueDate: dateIn(10) })
    await InvoiceDeliveryService.send('inv-1', 'email')

    const [pre, due, over] = captured.insertedReminders!.map((r) =>
      new Date(r.scheduled_for as string).getTime(),
    )
    expect(Math.round((due - pre) / DAY)).toBe(3)
    expect(Math.round((over - due) / DAY)).toBe(3)
  })
})

describe('payment reminders: content and reschedule', () => {
  it('sends by SMS to the customer phone, carrying the pay link and balance', async () => {
    const { captured } = setup()
    await InvoiceDeliveryService.send('inv-1', 'email')

    const row = captured.insertedReminders![0]
    expect(row).toMatchObject({
      organization_id: 'org-1',
      related_type: 'invoice',
      related_id: 'inv-1',
      channel: 'sms',
      recipient_type: 'customer',
      recipient_phone: '+15555550123',
    })
    const vars = row.template_variables as Record<string, string>
    expect(vars.invoice_number).toBe('INV-001')
    expect(vars.company_name).toBe('Acme Abatement')
    expect(vars.pay_url).toContain('/pay/inv-1')
  })

  it('cancels prior pending reminders before scheduling new ones', async () => {
    // Without this a resent invoice leaves the first batch in place and the
    // customer gets every reminder twice.
    const { captured } = setup()
    await InvoiceDeliveryService.send('inv-1', 'email')
    expect(captured.cancelUpdates).toContainEqual({ status: 'cancelled' })
  })

  it('cancelPaymentReminders marks pending reminders canceled', async () => {
    // Called when an invoice is paid or voided, so a customer who has already
    // paid does not get chased.
    const { captured } = setup()
    await InvoiceDeliveryService.cancelPaymentReminders('inv-1')
    expect(captured.cancelUpdates).toContainEqual({ status: 'cancelled' })
  })
})
