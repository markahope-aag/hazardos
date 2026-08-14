import { addDays, addMinutes, getDay, setHours, setMilliseconds, setMinutes, setSeconds } from 'date-fns'

/**
 * Turns a process step's due-date rule into an actual timestamp.
 *
 * A chain creates every one of its steps at the moment it fires, each with a
 * different due date. This is the function that decides those dates, so it is
 * the difference between a follow-up landing on the right morning and landing
 * on a Sunday nobody works. Kept pure and separate from anything that touches
 * the database so it can be tested exhaustively.
 */

export type DueMode = 'immediate' | 'days_at_time' | 'days_hours_minutes'

export interface StepDueRule {
  due_mode: DueMode
  due_days: number
  /** 'HH:MM' or 'HH:MM:SS'. Required when due_mode is 'days_at_time'. */
  due_time: string | null
  due_hours: number
  due_minutes: number
}

export interface WorkingDayRules {
  use_saturdays: boolean
  use_sundays: boolean
}

const SATURDAY = 6
const SUNDAY = 0

// Guard against a process configured with both weekend days excluded and, in
// some future variant, every other day too. Seven attempts is always enough
// for a real calendar; the cap exists so a misconfiguration cannot spin.
const MAX_WEEKEND_SHIFTS = 7

function isAllowedDay(date: Date, rules: WorkingDayRules): boolean {
  const day = getDay(date)
  if (day === SATURDAY) return rules.use_saturdays
  if (day === SUNDAY) return rules.use_sundays
  return true
}

/**
 * Pushes a date forward to the next permitted day, preserving time of day.
 *
 * Forward rather than backward on purpose: moving a follow-up earlier can put
 * it before the event that triggered it, which reads as already overdue the
 * moment it is created.
 */
export function shiftToWorkingDay(date: Date, rules: WorkingDayRules): Date {
  let result = date
  for (let i = 0; i < MAX_WEEKEND_SHIFTS && !isAllowedDay(result, rules); i++) {
    result = addDays(result, 1)
  }
  return result
}

function applyClockTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  return setMilliseconds(setSeconds(setMinutes(setHours(date, hours || 0), minutes || 0), 0), 0)
}

/**
 * @param rule       the step's due-date configuration
 * @param firedAt    when the chain was triggered
 * @param dayRules   the parent process's weekend flags
 */
export function computeStepDueDate(
  rule: StepDueRule,
  firedAt: Date,
  dayRules: WorkingDayRules,
): Date {
  switch (rule.due_mode) {
    case 'immediate':
      // Deliberately not shifted. "Immediately when added" means now, and a
      // thank-you text sent the instant a job is marked complete should go out
      // on a Saturday if that is when the work finished.
      return firedAt

    case 'days_at_time': {
      const shifted = shiftToWorkingDay(addDays(firedAt, rule.due_days), dayRules)
      // Clock time is applied after the weekend shift so a step due "3 days at
      // 5am" that slides from Sunday to Monday is still due at 5am.
      return applyClockTime(shifted, rule.due_time ?? '00:00')
    }

    case 'days_hours_minutes': {
      const offset = addMinutes(
        addDays(firedAt, rule.due_days),
        rule.due_hours * 60 + rule.due_minutes,
      )
      return shiftToWorkingDay(offset, dayRules)
    }

    default: {
      // Exhaustiveness: a new mode added to the schema without a branch here
      // should fail loudly rather than silently scheduling for now.
      const unreachable: never = rule.due_mode
      throw new Error(`Unknown due_mode: ${String(unreachable)}`)
    }
  }
}

/**
 * When to remind, or null if the step has no reminder.
 *
 * Reminders are not shifted off weekends. The reminder exists to arrive before
 * a due date that has already been placed on a working day, and moving it
 * forward could push it past the thing it is reminding about.
 */
export function computeReminderAt(dueAt: Date, reminderMinutes: number | null): Date | null {
  if (reminderMinutes === null || reminderMinutes <= 0) return null
  return addMinutes(dueAt, -reminderMinutes)
}
