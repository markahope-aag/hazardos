import { describe, it, expect } from 'vitest'
import {
  buildProcessWorkRows,
  type ProcessRow,
  type ProcessStepRow,
  type RunContext,
} from '@/lib/services/activity-process-runner'

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
