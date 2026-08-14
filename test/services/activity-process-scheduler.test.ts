import { describe, it, expect } from 'vitest'
import {
  computeReminderAt,
  computeStepDueDate,
  shiftToWorkingDay,
  type StepDueRule,
  type WorkingDayRules,
} from '@/lib/services/activity-process-scheduler'

// 2026-08-14 is a Friday. Every case below is anchored to it so the weekday
// arithmetic is readable rather than something you have to work out.
const FRIDAY = new Date(2026, 7, 14, 9, 30, 0)
const SATURDAY = new Date(2026, 7, 15, 9, 30, 0)
const SUNDAY = new Date(2026, 7, 16, 9, 30, 0)

const WEEKDAYS_ONLY: WorkingDayRules = { use_saturdays: false, use_sundays: false }
const ALL_DAYS: WorkingDayRules = { use_saturdays: true, use_sundays: true }

const rule = (overrides: Partial<StepDueRule>): StepDueRule => ({
  due_mode: 'immediate',
  due_days: 0,
  due_time: null,
  due_hours: 0,
  due_minutes: 0,
  ...overrides,
})

describe('shiftToWorkingDay', () => {
  it('leaves a weekday alone', () => {
    expect(shiftToWorkingDay(FRIDAY, WEEKDAYS_ONLY)).toEqual(FRIDAY)
  })

  it('moves Saturday to Monday when neither weekend day is worked', () => {
    const result = shiftToWorkingDay(SATURDAY, WEEKDAYS_ONLY)
    expect(result.getDay()).toBe(1)
    expect(result.getDate()).toBe(17)
  })

  it('moves Sunday to Monday when Sunday is not worked', () => {
    const result = shiftToWorkingDay(SUNDAY, WEEKDAYS_ONLY)
    expect(result.getDate()).toBe(17)
  })

  it('moves Saturday to Sunday when only Sunday is worked', () => {
    const result = shiftToWorkingDay(SATURDAY, { use_saturdays: false, use_sundays: true })
    expect(result.getDay()).toBe(0)
    expect(result.getDate()).toBe(16)
  })

  it('leaves the weekend alone when both days are worked', () => {
    expect(shiftToWorkingDay(SATURDAY, ALL_DAYS)).toEqual(SATURDAY)
    expect(shiftToWorkingDay(SUNDAY, ALL_DAYS)).toEqual(SUNDAY)
  })

  it('preserves time of day when it shifts', () => {
    const result = shiftToWorkingDay(SATURDAY, WEEKDAYS_ONLY)
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(30)
  })
})

describe('computeStepDueDate', () => {
  it('returns the trigger time for an immediate step', () => {
    expect(computeStepDueDate(rule({ due_mode: 'immediate' }), FRIDAY, WEEKDAYS_ONLY))
      .toEqual(FRIDAY)
  })

  it('does not shift an immediate step off a weekend', () => {
    // A thank-you text fired the moment a Saturday job is completed should go
    // out on the Saturday, not queue up until Monday.
    expect(computeStepDueDate(rule({ due_mode: 'immediate' }), SATURDAY, WEEKDAYS_ONLY))
      .toEqual(SATURDAY)
  })

  it('applies the clock time for days_at_time', () => {
    // AHS have a live step: "Send proposal, due in 3 days at 05:00".
    const result = computeStepDueDate(
      rule({ due_mode: 'days_at_time', due_days: 3, due_time: '05:00' }),
      FRIDAY,
      ALL_DAYS,
    )
    expect(result.getDate()).toBe(17)
    expect(result.getHours()).toBe(5)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
  })

  it('accepts HH:MM:SS as stored by a Postgres time column', () => {
    const result = computeStepDueDate(
      rule({ due_mode: 'days_at_time', due_days: 1, due_time: '12:00:00' }),
      FRIDAY,
      ALL_DAYS,
    )
    expect(result.getHours()).toBe(12)
    expect(result.getMinutes()).toBe(0)
  })

  it('keeps the clock time after a weekend shift', () => {
    // Friday + 1 day lands on Saturday, which slides to Monday. The step is
    // still due at 5am, not at whatever time the shift happened to produce.
    const result = computeStepDueDate(
      rule({ due_mode: 'days_at_time', due_days: 1, due_time: '05:00' }),
      FRIDAY,
      WEEKDAYS_ONLY,
    )
    expect(result.getDate()).toBe(17)
    expect(result.getHours()).toBe(5)
  })

  it('defaults to midnight when days_at_time has no time', () => {
    const result = computeStepDueDate(
      rule({ due_mode: 'days_at_time', due_days: 2, due_time: null }),
      FRIDAY,
      ALL_DAYS,
    )
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })

  it('adds days, hours and minutes for the offset mode', () => {
    const result = computeStepDueDate(
      rule({ due_mode: 'days_hours_minutes', due_days: 4, due_hours: 2, due_minutes: 15 }),
      FRIDAY,
      ALL_DAYS,
    )
    expect(result.getDate()).toBe(18)
    expect(result.getHours()).toBe(11)
    expect(result.getMinutes()).toBe(45)
  })

  it('shifts an offset step off a weekend', () => {
    // Friday + 1 day = Saturday, which is not worked.
    const result = computeStepDueDate(
      rule({ due_mode: 'days_hours_minutes', due_days: 1 }),
      FRIDAY,
      WEEKDAYS_ONLY,
    )
    expect(result.getDay()).toBe(1)
  })

  it('handles the long tail of a nurture chain', () => {
    // AHS's live proposal chain runs to day 365.
    const result = computeStepDueDate(
      rule({ due_mode: 'days_hours_minutes', due_days: 365 }),
      FRIDAY,
      ALL_DAYS,
    )
    expect(result.getFullYear()).toBe(2027)
    expect(result.getMonth()).toBe(7)
    expect(result.getDate()).toBe(14)
  })
})

describe('computeReminderAt', () => {
  it('returns null when there is no reminder', () => {
    expect(computeReminderAt(FRIDAY, null)).toBeNull()
  })

  it('treats zero minutes as no reminder', () => {
    expect(computeReminderAt(FRIDAY, 0)).toBeNull()
  })

  it('subtracts the offset from the due date', () => {
    const result = computeReminderAt(FRIDAY, 15)
    expect(result?.getHours()).toBe(9)
    expect(result?.getMinutes()).toBe(15)
  })

  it('can cross midnight backwards', () => {
    const midnight = new Date(2026, 7, 14, 0, 10, 0)
    const result = computeReminderAt(midnight, 30)
    expect(result?.getDate()).toBe(13)
    expect(result?.getHours()).toBe(23)
    expect(result?.getMinutes()).toBe(40)
  })
})
