import { differenceInCalendarDays } from 'date-fns'
/**
 * Shared calendar types and pure helpers, split out of calendar-view.tsx
 * (1,450 lines) so the view, its detail panels and this contract are separate
 * units. No behaviour change — these are the same declarations, exported.
 */

export type ViewMode = 'month' | 'week' | 'day'
export type EventKind = 'job' | 'survey' | 'deadline' | 'external' | 'industry'

// Postgres DATE columns come across the wire as bare 'YYYY-MM-DD' strings.
// date-fns' parseISO treats those as UTC midnight per the ISO spec, which
// means in any US timezone the value renders as the previous day locally —
// so a job scheduled for April 19 silently shows up on April 18 (or falls
// off the visible grid). Parse as local-time to pin the calendar day to
// the date the user actually picked.
// One implementation, shared with the server. See lib/utils/local-date.ts
// for why a date-only string must not go through `new Date()`.
export { parseLocalDate } from '@/lib/utils/local-date'

export interface CalendarJob {
  id: string
  job_number: string
  name: string | null
  status: string
  scheduled_start_date: string
  scheduled_start_time: string | null
  scheduled_end_date: string | null
  estimated_duration_hours: number | null
  proposal_id: string | null
  job_address: string
  job_city: string | null
  customer: {
    id: string
    name: string
    company_name: string | null
  } | null
  crew?: { is_lead: boolean; profile: { id: string; full_name: string | null } | null }[]
}

export interface CalendarSurvey {
  id: string
  job_name: string
  status: string
  appointment_status: string | null
  scheduled_date: string
  scheduled_time_start: string | null
  scheduled_time_end: string | null
  site_address: string
  site_city: string | null
  hazard_type: string
  customer_name: string
  assigned_to: string | null
  customer: {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
    name: string | null
  } | null
  assignee: {
    id: string
    first_name: string | null
    last_name: string | null
  } | null
}

export interface RegulatoryDeadline {
  id: string
  kind: 'epa_asbestos_notification'
  label: string
  deadline_date: string
  job_id: string
  job_number: string
  job_name: string | null
  job_start_date: string
  customer_name: string | null
}

export interface ExternalEvent {
  id: string
  summary: string
  start: string | null
  end: string | null
  all_day: boolean
  location: string | null
  html_link: string | null
}

export interface IndustryEvent {
  id: string
  category: string
  title: string
  start_at: string
  end_at: string
  all_day: boolean
  location: string | null
  description: string | null
  registration_url: string | null
}

export interface TeamMember {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

// Unified event the calendar grid renders. The original record is
// kept on `raw` so the detail Sheet can branch on type without
// re-fetching anything.
export interface CalendarEvent {
  id: string
  kind: EventKind
  title: string
  startDate: Date
  endDate: Date
  startTime: string | null
  assigneeIds: string[]
  raw:
    | { kind: 'job'; job: CalendarJob }
    | { kind: 'survey'; survey: CalendarSurvey }
    | { kind: 'deadline'; deadline: RegulatoryDeadline }
    | { kind: 'external'; event: ExternalEvent }
    | { kind: 'industry'; event: IndustryEvent }
}

export const DEFAULT_TYPE_FILTER: Record<EventKind, boolean> = {
  job: true,
  survey: true,
  deadline: true,
  external: true,
  industry: true,
}

// Statuses that mean the work is finished — hidden by default so the
// calendar shows what's still on the books, not the archive.
export const FINISHED_JOB_STATUSES = new Set([
  'completed',
  'invoiced',
  'paid',
  'closed',
  'cancelled',
])
export const FINISHED_SURVEY_STATUSES = new Set(['completed', 'cancelled'])
export const FINISHED_APPOINTMENT_STATUSES = new Set(['completed', 'cancelled', 'no_show'])

export function isEventFinished(event: CalendarEvent): boolean {
  if (event.raw.kind === 'job') {
    return FINISHED_JOB_STATUSES.has(event.raw.job.status)
  }
  if (event.raw.kind === 'survey') {
    const s = event.raw.survey
    return (
      FINISHED_SURVEY_STATUSES.has(s.status) ||
      (s.appointment_status !== null && FINISHED_APPOINTMENT_STATUSES.has(s.appointment_status))
    )
  }
  return false
}

// Multi-day events render as continuous bands like Google Calendar.
// Lanes stack vertically inside each week row; overflow becomes a
// "+N more" link on the affected day cell.
export const LANE_HEIGHT = 22
export const MAX_LANES_MONTH = 4
export const MAX_LANES_WEEK = 18

export interface PlacedBand {
  event: CalendarEvent
  startCol: number // 0-6 within the week
  endCol: number // 0-6 within the week
  lane: number
  isStart: boolean // event begins on or after this week's start
  isEnd: boolean // event ends on or before this week's end
}

// Shared: rendered both in the month grid (calendar-view) and the detail panel
// (calendar-details), so it lives here rather than in either one.
export const INDUSTRY_CATEGORY_LABELS: Record<string, string> = {
  'nari-madison': 'NARI of Madison',
  general: 'Industry event',
}

// Greedy lane assignment: longer events go first so they win lower
// lanes and stay anchored to the top of the row. Ties break by start
// date so order is stable across re-renders.
export function layoutWeek(events: CalendarEvent[], weekStart: Date, weekEnd: Date): PlacedBand[] {
  const overlapping = events.filter(
    (ev) => ev.endDate >= weekStart && ev.startDate <= weekEnd,
  )

  overlapping.sort((a, b) => {
    const lenA = differenceInCalendarDays(a.endDate, a.startDate)
    const lenB = differenceInCalendarDays(b.endDate, b.startDate)
    if (lenA !== lenB) return lenB - lenA
    const startCmp = a.startDate.getTime() - b.startDate.getTime()
    if (startCmp !== 0) return startCmp
    return a.id.localeCompare(b.id)
  })

  const lanes: number[] = [] // lanes[i] = endCol of latest band in lane i
  const placed: PlacedBand[] = []

  for (const ev of overlapping) {
    const startCol = ev.startDate < weekStart ? 0 : differenceInCalendarDays(ev.startDate, weekStart)
    const endCol = ev.endDate > weekEnd ? 6 : differenceInCalendarDays(ev.endDate, weekStart)

    let lane = 0
    while (lane < lanes.length && lanes[lane] >= startCol) lane++
    lanes[lane] = endCol

    placed.push({
      event: ev,
      startCol,
      endCol,
      lane,
      isStart: ev.startDate >= weekStart,
      isEnd: ev.endDate <= weekEnd,
    })
  }

  return placed
}
