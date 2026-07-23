import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock factories are hoisted, so variables referenced inside them must be
// declared via vi.hoisted() rather than regular `const` — otherwise the
// hoisted factory runs before the module-level declaration and blows up
// with "Cannot access 'x' before initialization".
const { smsSendMock, emailSendMock } = vi.hoisted(() => ({
  smsSendMock: vi.fn(),
  emailSendMock: vi.fn(),
}))

// reminder-sender runs from the cron (no session), so it uses the admin
// client. The old cookie client silently dropped every write under RLS — the
// bug this file guards against ("no silent success").
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/services/sms-service', () => ({
  SmsService: {
    send: smsSendMock,
  },
}))

// reminder-sender now sends through EmailService instead of calling
// Resend directly; mock the service so tests don't need a service-role
// key or a live Resend connection.
vi.mock('@/lib/services/email/email-service', () => ({
  EmailService: {
    send: emailSendMock,
  },
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { sendReminderRow } from '@/lib/services/reminder-sender'

type TableName =
  | 'scheduled_reminders'
  | 'organizations'
  | 'jobs'
  | 'customers'
  | 'invoices'

// Builder for the Supabase fluent API. Each test seeds the tables it cares
// about; everything else returns null.
function makeSupabase(tables: Partial<Record<TableName, Record<string, unknown> | null>>) {
  const updates: Record<string, unknown>[] = []

  const chain = (tableName: TableName) => {
    const row = tables[tableName] ?? null
    return {
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: row, error: row ? null : { code: 'PGRST116' } }),
          maybeSingle: () => Promise.resolve({ data: row, error: null }),
        }),
      }),
      update: (u: Record<string, unknown>) => {
        updates.push({ table: tableName, ...u })
        // markStatus now chains .select('id') and asserts a row came back, so
        // the update terminal must return a matched row, not null.
        const result = Promise.resolve({ data: [{ id: 'updated' }], error: null })
        return {
          eq: () => ({
            select: () => result,
            then: (onF: (v: unknown) => unknown) => result.then(onF),
          }),
        }
      },
    }
  }

  return {
    from: vi.fn((tableName: TableName) => chain(tableName)),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u' } } }) },
    __updates: updates,
  }
}

describe('sendReminderRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_API_KEY = 'test_resend_key'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
  })

  it('sends a confirmation email with ONLY safe fields — no internal notes leak', async () => {
    const supabase = makeSupabase({
      scheduled_reminders: {
        id: 'r1',
        organization_id: 'org1',
        related_type: 'job',
        related_id: 'job1',
        channel: 'email',
        template_slug: 'job_confirmation',
        recipient_email: 'cust@example.com',
        recipient_phone: null,
        status: 'pending',
        template_variables: {
          customer_name: 'Pat Q',
          scheduled_date: '2026-05-01',
          scheduled_time: '08:00',
          property_address: '123 Elm St',
          job_number: 'JOB-2026-0009',
        },
      },
      organizations: { name: 'Acme Abatement', email: 'hi@acme.test' },
      jobs: { customer_id: 'c1' },
      customers: {
        email: 'cust@example.com',
        phone: null,
        opted_into_email: true,
        sms_opt_in: true,
      },
    })
    vi.mocked(createAdminClient).mockReturnValue(supabase as unknown as never)
    emailSendMock.mockResolvedValue({ auditId: 'a1', providerMessageId: 'msg1' })

    const result = await sendReminderRow('r1')
    expect(result).toEqual({ sent: true })
    expect(emailSendMock).toHaveBeenCalledTimes(1)

    // EmailService.send(orgId, input, options) — the payload the
    // reminder sender built is the second arg.
    const email = emailSendMock.mock.calls[0][1]
    // Critical assertions: no internal fields in the payload.
    const serialized = JSON.stringify(email)
    expect(serialized).not.toMatch(/internal_notes/i)
    expect(serialized).not.toMatch(/access_notes/i)
    expect(serialized).not.toMatch(/customer[._]notes/i)
    // Sanity: the safe fields ARE present.
    expect(serialized).toContain('Pat Q')
    expect(serialized).toContain('123 Elm St')
    expect(serialized).toContain('JOB-2026-0009')
    expect(serialized).toContain('Acme Abatement')
  })

  it('skips and cancels the row when customer has opted out of email', async () => {
    const supabase = makeSupabase({
      scheduled_reminders: {
        id: 'r2',
        organization_id: 'org1',
        related_type: 'job',
        related_id: 'job1',
        channel: 'email',
        template_slug: 'job_confirmation',
        recipient_email: 'cust@example.com',
        status: 'pending',
        template_variables: {
          customer_name: 'A',
          scheduled_date: '2026-05-01',
          scheduled_time: null,
          property_address: '1 St',
          job_number: 'J1',
        },
      },
      organizations: { name: 'Org', email: 'o@o.test' },
      jobs: { customer_id: 'c1' },
      customers: {
        email: 'cust@example.com',
        phone: null,
        opted_into_email: false,
        sms_opt_in: true,
      },
    })
    vi.mocked(createAdminClient).mockReturnValue(supabase as unknown as never)

    const result = await sendReminderRow('r2')

    expect(result.sent).toBe(false)
    expect(result.skipped).toBe('opted_out')
    expect(emailSendMock).not.toHaveBeenCalled()
    // The row should have been cancelled, not just left pending — so the
    // cron won't retry it forever.
    const cancelUpdate = (supabase.__updates as Record<string, unknown>[]).find(
      (u) => u.table === 'scheduled_reminders' && u.status === 'cancelled',
    )
    expect(cancelUpdate).toBeTruthy()
  })

  it('dispatches SMS reminders via SmsService and marks sent', async () => {
    const supabase = makeSupabase({
      scheduled_reminders: {
        id: 'r3',
        organization_id: 'org1',
        related_type: 'job',
        related_id: 'job1',
        channel: 'sms',
        template_slug: 'job_reminder_day',
        recipient_email: null,
        recipient_phone: '+15555551234',
        status: 'pending',
        template_variables: {
          customer_name: 'Pat',
          scheduled_date: '2026-05-01',
          scheduled_time: '08:00',
          property_address: '123 Elm St',
          job_number: 'J1',
        },
      },
      organizations: { name: 'Acme', email: 'h@h.test' },
      jobs: { customer_id: 'c1' },
      customers: {
        email: null,
        phone: '+15555551234',
        opted_into_email: true,
        sms_opt_in: true,
      },
    })
    vi.mocked(createAdminClient).mockReturnValue(supabase as unknown as never)
    smsSendMock.mockResolvedValue({ id: 'sms1' })

    const result = await sendReminderRow('r3')
    expect(result).toEqual({ sent: true })

    expect(smsSendMock).toHaveBeenCalledTimes(1)
    const call = smsSendMock.mock.calls[0]
    const orgArg = call[0]
    const input = call[1]
    expect(orgArg).toBe('org1')
    expect(input.to).toBe('+15555551234')
    const serialized = JSON.stringify(input)
    expect(serialized).not.toMatch(/internal_notes/i)
    expect(serialized).not.toMatch(/access_notes/i)
    expect(input.body).toContain('Pat')
    expect(input.body).toContain('123 Elm St')
    expect(input.body).toContain('STOP')
  })

  it('cancels the row when SMS service rejects due to opt-out (no retry loop)', async () => {
    const supabase = makeSupabase({
      scheduled_reminders: {
        id: 'r4',
        organization_id: 'org1',
        related_type: 'job',
        related_id: 'job1',
        channel: 'sms',
        template_slug: 'job_reminder_week',
        recipient_email: null,
        recipient_phone: '+15555551234',
        status: 'pending',
        template_variables: {
          customer_name: 'Pat',
          scheduled_date: '2026-05-01',
          scheduled_time: null,
          property_address: '123 Elm St',
          job_number: 'J1',
        },
      },
      organizations: { name: 'Acme', email: 'h@h.test' },
      jobs: { customer_id: 'c1' },
      customers: {
        email: null,
        phone: '+15555551234',
        opted_into_email: true,
        sms_opt_in: false,
      },
    })
    vi.mocked(createAdminClient).mockReturnValue(supabase as unknown as never)
    smsSendMock.mockRejectedValue(new Error('Customer has not opted in to SMS'))

    const result = await sendReminderRow('r4')

    expect(result.sent).toBe(false)
    expect(result.skipped).toBe('opted_out')
    const cancelUpdate = (supabase.__updates as Record<string, unknown>[]).find(
      (u) => u.table === 'scheduled_reminders' && u.status === 'cancelled',
    )
    expect(cancelUpdate).toBeTruthy()
  })

  it('marks the row failed on unknown template slug (no silent success)', async () => {
    const supabase = makeSupabase({
      scheduled_reminders: {
        id: 'r5',
        organization_id: 'org1',
        related_type: 'job',
        related_id: 'job1',
        channel: 'email',
        template_slug: 'mystery_template',
        recipient_email: 'cust@example.com',
        status: 'pending',
        template_variables: null,
      },
      organizations: { name: 'O', email: 'o@o.test' },
    })
    vi.mocked(createAdminClient).mockReturnValue(supabase as unknown as never)

    const result = await sendReminderRow('r5')

    expect(result.sent).toBe(false)
    expect(result.skipped).toBe('unknown_template')
    expect(emailSendMock).not.toHaveBeenCalled()
  })

  it('resolves customer_id from invoices for payment reminders so SmsService can enforce opt-in (I10)', async () => {
    // Previously customerId stayed null for related_type === 'invoice', so
    // SmsService.send()'s sms_opt_in check — gated on customer_id being
    // present — silently never ran for payment reminders.
    const supabase = makeSupabase({
      scheduled_reminders: {
        id: 'r6',
        organization_id: 'org1',
        related_type: 'invoice',
        related_id: 'inv1',
        channel: 'sms',
        template_slug: 'payment_reminder_due',
        recipient_email: null,
        recipient_phone: '+15555559999',
        status: 'pending',
        template_variables: {
          invoice_number: 'INV-1001',
          amount: '$500.00',
          due_date: '2026-07-15',
          pay_url: 'https://app.test/pay/inv1',
        },
      },
      organizations: { name: 'Acme', email: 'h@h.test' },
      invoices: { customer_id: 'c9' },
      customers: {
        email: null,
        phone: '+15555559999',
        opted_into_email: true,
        sms_opt_in: true,
      },
    })
    vi.mocked(createAdminClient).mockReturnValue(supabase as unknown as never)
    smsSendMock.mockResolvedValue({ id: 'sms2' })

    const result = await sendReminderRow('r6')
    expect(result).toEqual({ sent: true })

    expect(smsSendMock).toHaveBeenCalledTimes(1)
    const input = smsSendMock.mock.calls[0][1]
    expect(input.customer_id).toBe('c9')
    expect(input.message_type).toBe('payment_reminder')
    expect(input.related_entity_type).toBe('invoice')
    expect(input.body).toContain('INV-1001')
  })

  it('cancels a payment reminder when the resolved customer has not opted into SMS (I10)', async () => {
    const supabase = makeSupabase({
      scheduled_reminders: {
        id: 'r7',
        organization_id: 'org1',
        related_type: 'invoice',
        related_id: 'inv2',
        channel: 'sms',
        template_slug: 'payment_reminder_overdue',
        recipient_email: null,
        recipient_phone: '+15555550000',
        status: 'pending',
        template_variables: {
          invoice_number: 'INV-2002',
          amount: '$250.00',
          due_date: '2026-07-01',
          pay_url: 'https://app.test/pay/inv2',
        },
      },
      organizations: { name: 'Acme', email: 'h@h.test' },
      invoices: { customer_id: 'c10' },
      customers: {
        email: null,
        phone: '+15555550000',
        opted_into_email: true,
        sms_opt_in: false,
      },
    })
    vi.mocked(createAdminClient).mockReturnValue(supabase as unknown as never)
    smsSendMock.mockRejectedValue(new Error('Customer has not opted in to SMS'))

    const result = await sendReminderRow('r7')

    expect(result.sent).toBe(false)
    expect(result.skipped).toBe('opted_out')
    // Proves customer_id was actually passed through — SmsService only
    // enforces opt-in when it receives one.
    const input = smsSendMock.mock.calls[0][1]
    expect(input.customer_id).toBe('c10')
    const cancelUpdate = (supabase.__updates as Record<string, unknown>[]).find(
      (u) => u.table === 'scheduled_reminders' && u.status === 'cancelled',
    )
    expect(cancelUpdate).toBeTruthy()
  })
})
