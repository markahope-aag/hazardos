/**
 * Shared dashboard filter helpers — period ranges, hazard types, URL parsing,
 * and trend computation. Used by stats cards, analytics API routes, and
 * chart components so every surface applies the same slicing rules.
 */

export type DashboardPeriod = 'week' | 'month' | 'quarter' | 'ytd'

export type DashboardHazardType =
  | 'all'
  | 'asbestos'
  | 'mold'
  | 'lead'
  | 'vermiculite'
  | 'other'

export interface DashboardFilters {
  period: DashboardPeriod
  hazardType: DashboardHazardType
}

export const DEFAULT_FILTERS: DashboardFilters = {
  period: 'month',
  hazardType: 'all',
}

export const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'ytd', label: 'Year to Date' },
]

export const HAZARD_TYPE_OPTIONS: Array<{ value: DashboardHazardType; label: string }> = [
  { value: 'all', label: 'All Hazards' },
  { value: 'asbestos', label: 'Asbestos' },
  { value: 'mold', label: 'Mold' },
  { value: 'lead', label: 'Lead' },
  { value: 'vermiculite', label: 'Vermiculite' },
  { value: 'other', label: 'Other' },
]

export interface PeriodRange {
  start: Date
  end: Date
  /** Previous-period window of equal length, for trend comparisons */
  previousStart: Date
  previousEnd: Date
  label: string
}

/**
 * Given a period and a reference date (defaults to now), returns the
 * [start, end] of the current window AND an equal-length window immediately
 * preceding it for trend comparisons.
 *
 * "week" = Monday of current ISO week through end of today
 * "month" = first of current month through end of today
 * "quarter" = first day of current quarter through end of today
 * "ytd" = Jan 1 of current year through end of today
 *
 * The "previous" window is the equivalent earlier period — previous month,
 * previous quarter, etc. — so % deltas are apples-to-apples.
 */
export function getPeriodRange(
  period: DashboardPeriod,
  reference: Date = new Date()
): PeriodRange {
  const now = new Date(reference)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  let start: Date
  let previousStart: Date
  let previousEnd: Date
  let label: string

  if (period === 'week') {
    // ISO week: Monday start
    start = new Date(now)
    const dayOfWeek = start.getDay() || 7 // Sun=0 -> 7
    start.setDate(start.getDate() - (dayOfWeek - 1))
    start.setHours(0, 0, 0, 0)
    previousStart = new Date(start)
    previousStart.setDate(previousStart.getDate() - 7)
    previousEnd = new Date(start)
    previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1)
    label = 'This Week'
  } else if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    start = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0)
    previousStart = new Date(now.getFullYear(), q * 3 - 3, 1, 0, 0, 0, 0)
    previousEnd = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0)
    previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1)
    label = 'This Quarter'
  } else if (period === 'ytd') {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    previousStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0)
    previousEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999)
    label = 'Year to Date'
  } else {
    // month (default)
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
    previousEnd = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1)
    label = 'This Month'
  }

  return { start, end: endOfToday, previousStart, previousEnd, label }
}

/**
 * Parse dashboard filter values out of a URL searchParams-like object.
 * Accepts either the plain `{period: 'month'}` shape produced by Next.js
 * App Router server components or a URLSearchParams instance from client
 * components. Unknown or missing values fall back to defaults.
 */
export function parseDashboardFilters(
  params: Record<string, string | string[] | undefined> | URLSearchParams | null | undefined
): DashboardFilters {
  const get = (key: string): string | undefined => {
    if (!params) return undefined
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined
    }
    const value = params[key]
    if (Array.isArray(value)) return value[0]
    return value
  }

  const rawPeriod = get('period')
  const rawHazard = get('hazard_type')

  const period: DashboardPeriod =
    rawPeriod === 'week' || rawPeriod === 'quarter' || rawPeriod === 'ytd' || rawPeriod === 'month'
      ? rawPeriod
      : DEFAULT_FILTERS.period

  const hazardType: DashboardHazardType =
    rawHazard === 'asbestos' ||
    rawHazard === 'mold' ||
    rawHazard === 'lead' ||
    rawHazard === 'vermiculite' ||
    rawHazard === 'other' ||
    rawHazard === 'all'
      ? rawHazard
      : DEFAULT_FILTERS.hazardType

  return { period, hazardType }
}

/**
 * Build a query string that preserves the current dashboard filters plus
 * any overrides. Used to wire drill-down links from stat cards.
 */
export function buildFilterQuery(
  filters: DashboardFilters,
  overrides: Record<string, string> = {}
): string {
  const params = new URLSearchParams()
  if (filters.period !== DEFAULT_FILTERS.period) {
    params.set('period', filters.period)
  }
  if (filters.hazardType !== DEFAULT_FILTERS.hazardType) {
    params.set('hazard_type', filters.hazardType)
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value) params.set(key, value)
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export interface Trend {
  /** Raw delta (current - previous) */
  delta: number
  /** Percent change. null when the previous value was 0 (undefined baseline). */
  percent: number | null
  direction: 'up' | 'down' | 'flat'
}

/**
 * Compare two numbers into a Trend suitable for rendering arrows and deltas.
 * Thresholds are intentionally small — a 1¢ change should still show an
 * arrow, but a zero baseline is always flat since percent isn't meaningful.
 */
export function computeTrend(current: number, previous: number): Trend {
  const delta = current - previous
  const percent = previous === 0 ? null : (delta / previous) * 100
  let direction: Trend['direction'] = 'flat'
  if (delta > 0.0001) direction = 'up'
  else if (delta < -0.0001) direction = 'down'
  return { delta, percent, direction }
}

/**
 * Map a dashboard hazard filter to the hazard_type enum values stored on
 * site_surveys. Returns null when the filter is 'all' (no constraint).
 */
export function hazardFilterToDbValue(filter: DashboardHazardType): string | null {
  if (filter === 'all') return null
  return filter
}
