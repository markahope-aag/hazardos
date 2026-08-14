import { describe, it, expect } from 'vitest'
import {
  ruleMatches,
  selectProcessesToRun,
  type ProcessEvent,
  type ProcessRule,
} from '@/lib/services/activity-process-rules'

const rule = (overrides: Partial<ProcessRule>): ProcessRule => ({
  id: 'rule-1',
  event_type: 'activity_completed',
  activity_type_id: null,
  outcome_id: null,
  pipeline_stage_id: null,
  job_status: null,
  lab_result: null,
  message_channel: null,
  contact_type: null,
  process_id: 'process-1',
  is_active: true,
  sort_order: 0,
  ...overrides,
})

const event = (overrides: Partial<ProcessEvent>): ProcessEvent => ({
  type: 'activity_completed',
  ...overrides,
})

describe('ruleMatches', () => {
  it('ignores inactive rules', () => {
    expect(ruleMatches(rule({ is_active: false }), event({}))).toBe(false)
  })

  it('requires the event type to match', () => {
    expect(ruleMatches(rule({ event_type: 'job_status_changed' }), event({}))).toBe(false)
  })

  it('matches when every qualifier is null', () => {
    // A rule with no conditions is a catch-all for its event type.
    expect(ruleMatches(rule({}), event({ activityTypeId: 'anything' }))).toBe(true)
  })

  it('matches when a named qualifier equals the event value', () => {
    expect(
      ruleMatches(rule({ outcome_id: 'outcome-x' }), event({ outcomeId: 'outcome-x' }))
    ).toBe(true)
  })

  it('does not match when a named qualifier differs', () => {
    expect(
      ruleMatches(rule({ outcome_id: 'outcome-x' }), event({ outcomeId: 'outcome-y' }))
    ).toBe(false)
  })

  it('does not match when the rule names a qualifier the event lacks', () => {
    // "Fires when the outcome is Not Interested" must not fire on an event
    // that carries no outcome at all.
    expect(ruleMatches(rule({ outcome_id: 'outcome-x' }), event({}))).toBe(false)
  })

  it('requires every named qualifier, not just one', () => {
    const r = rule({ activity_type_id: 'type-a', outcome_id: 'outcome-x' })
    expect(ruleMatches(r, event({ activityTypeId: 'type-a', outcomeId: 'outcome-x' }))).toBe(true)
    expect(ruleMatches(r, event({ activityTypeId: 'type-a', outcomeId: 'outcome-y' }))).toBe(false)
  })

  it('reproduces their catch-all bounce rule', () => {
    // "Email Failure on any reference fires Bad email bounce": outcome set,
    // activity type left as Any.
    const r = rule({ event_type: 'message_failed', message_channel: 'email' })
    expect(ruleMatches(r, event({ type: 'message_failed', messageChannel: 'email' }))).toBe(true)
    expect(ruleMatches(r, event({ type: 'message_failed', messageChannel: 'sms' }))).toBe(false)
  })

  it('filters by contact segment when asked', () => {
    const r = rule({ contact_type: 'commercial' })
    expect(ruleMatches(r, event({ contactType: 'commercial' }))).toBe(true)
    expect(ruleMatches(r, event({ contactType: 'residential' }))).toBe(false)
    expect(ruleMatches(r, event({}))).toBe(false)
  })

  it('ignores segment when the rule does not name one', () => {
    expect(ruleMatches(rule({}), event({ contactType: 'commercial' }))).toBe(true)
    expect(ruleMatches(rule({}), event({ contactType: null }))).toBe(true)
  })

  it('matches a lab result event', () => {
    const r = rule({ event_type: 'lab_result_received', lab_result: 'positive' })
    expect(ruleMatches(r, event({ type: 'lab_result_received', labResult: 'positive' }))).toBe(true)
    expect(ruleMatches(r, event({ type: 'lab_result_received', labResult: 'negative' }))).toBe(false)
  })
})

describe('selectProcessesToRun', () => {
  it('returns nothing when no rule matches', () => {
    expect(selectProcessesToRun([rule({ outcome_id: 'other' })], event({ outcomeId: 'x' })))
      .toEqual([])
  })

  it('fires every matching rule, not only the most specific', () => {
    // AHS keep a catch-all alongside specific rules and mean both to apply.
    const rules = [
      rule({ id: 'a', process_id: 'catch-all', sort_order: 1 }),
      rule({ id: 'b', process_id: 'specific', outcome_id: 'outcome-x', sort_order: 2 }),
    ]
    expect(selectProcessesToRun(rules, event({ outcomeId: 'outcome-x' })))
      .toEqual(['catch-all', 'specific'])
  })

  it('returns processes in rule order', () => {
    const rules = [
      rule({ id: 'a', process_id: 'second', sort_order: 20 }),
      rule({ id: 'b', process_id: 'first', sort_order: 10 }),
    ]
    expect(selectProcessesToRun(rules, event({}))).toEqual(['first', 'second'])
  })

  it('runs a process once even when two rules point at it', () => {
    // A residential rule and a commercial rule sharing a chain is legitimate,
    // and must not create the work twice.
    const rules = [
      rule({ id: 'a', process_id: 'shared', contact_type: null, sort_order: 1 }),
      rule({ id: 'b', process_id: 'shared', outcome_id: 'outcome-x', sort_order: 2 }),
    ]
    expect(selectProcessesToRun(rules, event({ outcomeId: 'outcome-x' }))).toEqual(['shared'])
  })

  it('breaks sort_order ties deterministically', () => {
    const rules = [
      rule({ id: 'b', process_id: 'p-b', sort_order: 0 }),
      rule({ id: 'a', process_id: 'p-a', sort_order: 0 }),
    ]
    expect(selectProcessesToRun(rules, event({}))).toEqual(['p-a', 'p-b'])
  })

  it('skips inactive rules', () => {
    const rules = [
      rule({ id: 'a', process_id: 'off', is_active: false }),
      rule({ id: 'b', process_id: 'on' }),
    ]
    expect(selectProcessesToRun(rules, event({}))).toEqual(['on'])
  })

  it('does not mutate the caller\'s array', () => {
    const rules = [
      rule({ id: 'b', process_id: 'p-b', sort_order: 20 }),
      rule({ id: 'a', process_id: 'p-a', sort_order: 10 }),
    ]
    selectProcessesToRun(rules, event({}))
    expect(rules[0].id).toBe('b')
  })
})
