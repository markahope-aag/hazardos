/**
 * Organization timezone helpers.
 *
 * The app treats the organization's timezone as the source of truth for
 * "today" and human-readable date/time displays. The Postgres side stores
 * TIMESTAMPTZ naturally, but the pieces of the app that reason about
 * dates as strings ("YYYY-MM-DD for the 'scheduled today' query") need
 * to render through the org's clock, not the server's.
 */

import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { format as formatDate } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'

export const DEFAULT_TIMEZONE = 'America/Chicago'

/**
 * Common US business timezones, ordered from East to West. Enough to
 * cover the realistic HazardOS customer footprint without drowning the
 * settings picker in all 600+ IANA zones. Any IANA string is accepted
 * by the backend; this list just drives the UI picker.
 */
export const US_TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'America/New_York', label: 'Eastern (New York)' },
  { value: 'America/Detroit', label: 'Eastern (Detroit)' },
  { value: 'America/Indiana/Indianapolis', label: 'Eastern (Indianapolis)' },
  { value: 'America/Chicago', label: 'Central (Chicago)' },
  { value: 'America/Denver', label: 'Mountain (Denver)' },
  { value: 'America/Phoenix', label: 'Mountain — no DST (Phoenix)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (Honolulu)' },
]

/**
 * Look up the caller's organization timezone. Falls back to the default
 * if the row is missing or has no value set — never throws, so callers
 * can use this in hot paths like "what date is it today" without
 * wrapping in try/catch.
 */
export async function getOrganizationTimezone(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('organizations')
    .select('timezone')
    .eq('id', organizationId)
    .single()
  if (error || !data?.timezone) return DEFAULT_TIMEZONE
  return data.timezone
}

/**
 * Returns today's date in the given timezone as a 'YYYY-MM-DD' string.
 * This is the key primitive for queries like "jobs scheduled today" —
 * Postgres's DATE columns don't carry timezone info, so "today" has to
 * be computed client-side against the org's clock.
 */
export function todayIso(timezone: string, reference: Date = new Date()): string {
  return formatInTimeZone(reference, timezone, 'yyyy-MM-dd')
}

/**
 * Returns today+N days in the given timezone as a 'YYYY-MM-DD' string.
 * Used for "next 30 days" windows. Done by converting to zoned time,
 * adding days via plain Date math, and formatting back — no tricky UTC
 * offset arithmetic.
 */
export function isoDateOffset(timezone: string, days: number, reference: Date = new Date()): string {
  const zoned = toZonedTime(reference, timezone)
  zoned.setDate(zoned.getDate() + days)
  return formatDate(zoned, 'yyyy-MM-dd')
}

/**
 * Format a Date or ISO string in the organization's timezone using any
 * date-fns format token. Use this anywhere user-facing text needs to
 * render a timestamp in the org's clock.
 */
export function formatInOrgTimezone(
  value: Date | string,
  timezone: string,
  pattern: string,
): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return formatInTimeZone(d, timezone, pattern)
}
