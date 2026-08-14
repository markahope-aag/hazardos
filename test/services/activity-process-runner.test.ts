import { describe, it, expect } from 'vitest'
import {
  buildProcessWorkRows,
  type ProcessRow,
  type ProcessStepRow,
  type RecipientContext,
  type RunContext,
} from '@/lib/services/activity-process-runner'

const recipient = (overrides: Partial<RecipientContext> = {}): RecipientContext => ({
  email: 'chad@example.test',
  phone: '+16085754508',
  variables: { customer_name: 'Chad' },
  ...overrides,
})

// Friday, so weekend shifting is one day away and easy to reason about.
const FIRED_AT = new Date(2026, 7, 14, 9, 0, 0)

const context = (overrides: Partial<RunContext> = {}): RunContext => ({
  organizationId: 'org-1',
  entityType: 'customer',
  entityId: 'contact-1',
  firedAt: FIRED_AT,
  actingUserId: 'user-acting',
  ...overrides,
})

const process = (overrides: Partial<ProcessRow> = {}): ProcessRow => ({
  id: 'process-1',
  name: 'Test chain',
  use_saturdays: true,
  use_sundays: true,
  is_active: true,
  ...overrides,
})

const step = (overrides: Partial<ProcessStepRow>): ProcessStepRow => ({
  id: 'step-1',
  sort_order: 0,
  kind: 'todo',
  activity_type_id: null,
  note: null,
  assignee_mode: 'unassigned',
  assigned_to: null,
  due_mode: 'immediate',
  due_days: 0,
  due_time: null,
  due_hours: 0,
  due_minutes: 0,
  reminder_minutes: null,
  email_template_id: null,
  sms_template_id: null,
  ...overrides,
})

describe('buildProcessWorkRows', () => {
  it('produces one row per step', () => {
    const rows = buildProcessWorkRows(
      process(),
      [step({ id: 'a' }), step({ id: 'b' }), step({ id: 'c' })],
      context()
    )
    expect(rows).toHaveLength(3)
  })

  it('orders by sort_order regardless of input order', () => {
    const rows = buildProcessWorkRows(
      process(),
      [step({ id: 'third', sort_order: 3 }), step({ id: 'first', sort_order: 1 })],
      context()
    )
    expect(rows.map((r) => r.process_step_id)).toEqual(['first', 'third'])
  })

  it('stamps every row with the entity and the process', () => {
    const [row] = buildProcessWorkRows(process(), [step({})], context())
    expect(row.entity_type).toBe('customer')
    expect(row.entity_id).toBe('contact-1')
    expect(row.process_id).toBe('process-1')
    expect(row.process_step_id).toBe('step-1')
  })

  it('resolves a named assignee', () => {
    const [row] = buildProcessWorkRows(
      process(),
      [step({ assignee_mode: 'user', assigned_to: 'user-gina' })],
      context()
    )
    expect(row.assigned_to).toBe('user-gina')
  })

  it('resolves current_user to whoever triggered it', () => {
    const [row] = buildProcessWorkRows(
      process(),
      [step({ assignee_mode: 'current_user' })],
      context({ actingUserId: 'user-bob' })
    )
    expect(row.assigned_to).toBe('user-bob')
  })

  it('leaves current_user unassigned when nobody triggered it', () => {
    // A chain fired by cron or a webhook has no acting user. Leaving the work
    // for someone to pick up beats dropping it.
    const [row] = buildProcessWorkRows(
      process(),
      [step({ assignee_mode: 'current_user' })],
      context({ actingUserId: null })
    )
    expect(row.assigned_to).toBeNull()
  })

  it('leaves unassigned steps unassigned', () => {
    const [row] = buildProcessWorkRows(
      process(),
      [step({ assignee_mode: 'unassigned', assigned_to: 'ignored' })],
      context()
    )
    expect(row.assigned_to).toBeNull()
  })

  it('staggers due dates across the chain', () => {
    // AHS's post-sale chain: two same-day sends, a survey at 7 days, a payment
    // check at 15.
    const rows = buildProcessWorkRows(
      process(),
      [
        step({ id: 's1', sort_order: 1, kind: 'email', due_mode: 'immediate' }),
        step({ id: 's2', sort_order: 2, kind: 'text', due_mode: 'immediate' }),
        step({ id: 's3', sort_order: 3, due_mode: 'days_hours_minutes', due_days: 7 }),
        step({ id: 's4', sort_order: 4, due_mode: 'days_hours_minutes', due_days: 15 }),
      ],
      context()
    )
    const days = rows.map((r) =>
      Math.round((new Date(r.due_date).getTime() - FIRED_AT.getTime()) / 86400000)
    )
    expect(days).toEqual([0, 0, 7, 15])
  })

  it('applies the process weekend rules to every step', () => {
    // Friday + 1 day is Saturday. With weekends off it moves to Monday.
    const [row] = buildProcessWorkRows(
      process({ use_saturdays: false, use_sundays: false }),
      [step({ due_mode: 'days_hours_minutes', due_days: 1 })],
      context()
    )
    expect(new Date(row.due_date).getDay()).toBe(1)
  })

  it('carries the kind, note, type and reminder through', () => {
    const [row] = buildProcessWorkRows(
      process(),
      [step({
        kind: 'call',
        note: 'Ask about the crawlspace',
        activity_type_id: 'type-confirm',
        reminder_minutes: 15,
      })],
      context()
    )
    expect(row.kind).toBe('call')
    expect(row.note).toBe('Ask about the crawlspace')
    expect(row.activity_type_id).toBe('type-confirm')
    expect(row.reminder_minutes).toBe(15)
  })

  it('emits ISO timestamps the RPC can cast', () => {
    const [row] = buildProcessWorkRows(process(), [step({})], context())
    expect(row.due_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('returns nothing for a process with no steps', () => {
    expect(buildProcessWorkRows(process(), [], context())).toEqual([])
  })

  it('does not mutate the steps it was given', () => {
    const steps = [step({ id: 'b', sort_order: 2 }), step({ id: 'a', sort_order: 1 })]
    buildProcessWorkRows(process(), steps, context())
    expect(steps[0].id).toBe('b')
  })
})

describe('buildProcessWorkRows: queued messages', () => {
  it('queues an email for an email step with a template', () => {
    const [row] = buildProcessWorkRows(
      process(),
      [step({ kind: 'email', email_template_id: 'tpl-email' })],
      context(),
      recipient()
    )
    expect(row.reminder).toMatchObject({
      channel: 'email',
      recipient_email: 'chad@example.test',
      recipient_phone: null,
      email_template_id: 'tpl-email',
      sms_template_id: null,
    })
  })

  it('queues an SMS for a text step with a template', () => {
    const [row] = buildProcessWorkRows(
      process(),
      [step({ kind: 'text', sms_template_id: 'tpl-sms' })],
      context(),
      recipient()
    )
    expect(row.reminder).toMatchObject({
      channel: 'sms',
      recipient_phone: '+16085754508',
      recipient_email: null,
      sms_template_id: 'tpl-sms',
    })
  })

  it('sends at the same moment the work item is due', () => {
    const [row] = buildProcessWorkRows(
      process(),
      [step({ kind: 'email', email_template_id: 'tpl', due_mode: 'days_hours_minutes', due_days: 2 })],
      context(),
      recipient()
    )
    expect(row.reminder?.scheduled_for).toBe(row.due_date)
  })

  it('passes only the customer-safe variables through', () => {
    const [row] = buildProcessWorkRows(
      process(),
      [step({ kind: 'email', email_template_id: 'tpl' })],
      context(),
      recipient({ variables: { customer_name: 'Chad', city: 'Madison' } })
    )
    expect(row.reminder?.template_variables).toEqual({ customer_name: 'Chad', city: 'Madison' })
  })

  it('leaves a call or to-do step with no message', () => {
    const rows = buildProcessWorkRows(
      process(),
      [step({ id: 'a', kind: 'call' }), step({ id: 'b', kind: 'todo' })],
      context(),
      recipient()
    )
    expect(rows.every((r) => r.reminder === undefined)).toBe(true)
  })

  it('falls back to a manual task when no template is chosen', () => {
    // The step still appears in the queue so somebody sends it by hand.
    // Dropping it would lose the work silently.
    const [row] = buildProcessWorkRows(
      process(),
      [step({ kind: 'email', email_template_id: null })],
      context(),
      recipient()
    )
    expect(row.kind).toBe('email')
    expect(row.reminder).toBeUndefined()
  })

  it('falls back to a manual task when there is no address on file', () => {
    const [row] = buildProcessWorkRows(
      process(),
      [step({ kind: 'email', email_template_id: 'tpl' })],
      context(),
      recipient({ email: null })
    )
    expect(row.reminder).toBeUndefined()
  })

  it('does not send an SMS to a contact with no phone number', () => {
    const [row] = buildProcessWorkRows(
      process(),
      [step({ kind: 'text', sms_template_id: 'tpl' })],
      context(),
      recipient({ phone: null })
    )
    expect(row.reminder).toBeUndefined()
  })

  it('queues nothing when the record has no contact details at all', () => {
    const rows = buildProcessWorkRows(
      process(),
      [step({ kind: 'email', email_template_id: 'tpl' })],
      context(),
      null
    )
    expect(rows[0].reminder).toBeUndefined()
  })

  it('does not cross channels when only the wrong template is set', () => {
    // An email step carrying only an SMS template is a misconfiguration, and
    // must not send over SMS instead.
    const [row] = buildProcessWorkRows(
      process(),
      [step({ kind: 'email', sms_template_id: 'tpl-sms' })],
      context(),
      recipient()
    )
    expect(row.reminder).toBeUndefined()
  })
})
