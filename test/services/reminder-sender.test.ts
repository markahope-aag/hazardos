import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock factories are hoisted, so variables referenced inside them must be
// declared via vi.hoisted() rather than regular `const` — otherwise the
// hoisted factory runs before the module-level declaration and blows up
// with "Cannot access 'x' before initialization".
const { smsSendMock, resendSendMock } = vi.hoisted(() => ({
  smsSendMock: vi.fn(),
  resendSendMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/sms-service', () => ({
  SmsService: {
    send: smsSendMock,
  },
}))

vi.mock('resend', () => ({
  // Use a class so `new Resend(...)` in the sender works; a plain vi.fn
  // implementation isn't invokable with `new` in this Vitest version.
  Resend: class MockResend {
    emails = { send: resendSendMock }
  },
}))

import { createClient } from '@/lib/supabase/server'
import { sendReminderRow } from '@/lib/services/reminder-sender'

type TableName =
  | 'scheduled_reminders'
  | 'organizations'
  | 'jobs'
  | 'customers'

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
        return {
          eq: () => Promise.resolve({ data: null, error: null }),
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
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as never)
    resendSendMock.mockResolvedValue({ data: { id: 'msg1' } })

    const result = await sendReminderRow('r1')
    expect(result).toEqual({ sent: true })
    expect(resendSendMock).toHaveBeenCalledTimes(1)

    const email = resendSendMock.mock.calls[0][0]
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
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as never)

    const result = await sendReminderRow('r2')

    expect(result.sent).toBe(false)
    expect(result.skipped).toBe('opted_out')
    expect(resendSendMock).not.toHaveBeenCalled()
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
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as never)
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
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as never)
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
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as never)

    const result = await sendReminderRow('r5')

    expect(result.sent).toBe(false)
    expect(result.skipped).toBe('unknown_template')
    expect(resendSendMock).not.toHaveBeenCalled()
  })
})
