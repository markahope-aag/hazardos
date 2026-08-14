'use client'

import { useQuery } from '@tanstack/react-query'

/**
 * The organization's working day, used to bound scheduling time pickers.
 *
 * Falls back to 6 AM–7 PM whenever the value hasn't loaded yet or the
 * request fails, so a picker never renders empty. Callers get a value
 * synchronously and don't have to handle a loading state.
 */
export interface BusinessHours {
  /** Earliest selectable time, HH:MM. */
  start: string
  /** Latest selectable time, HH:MM. */
  end: string
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = { start: '06:00', end: '19:00' }

// Postgres `time` columns come back as 'HH:MM:SS'. The time picker keys its
// options on 'HH:MM', so trim before comparing or nothing matches.
function toHourMinute(value: unknown): string | null {
  return typeof value === 'string' && value.length >= 5 ? value.slice(0, 5) : null
}

export function useBusinessHours(): BusinessHours {
  const { data } = useQuery({
    queryKey: ['organization', 'business-hours'],
    queryFn: async (): Promise<BusinessHours> => {
      const res = await fetch('/api/organizations/me')
      if (!res.ok) throw new Error('Failed to load business hours')
      const json = await res.json()
      const org = json?.organization ?? {}
      return {
        start: toHourMinute(org.business_hours_start) ?? DEFAULT_BUSINESS_HOURS.start,
        end: toHourMinute(org.business_hours_end) ?? DEFAULT_BUSINESS_HOURS.end,
      }
    },
    // The working day changes about once a year. Keep it cached so every
    // time picker on a page shares one request.
    staleTime: 30 * 60 * 1000,
  })

  return data ?? DEFAULT_BUSINESS_HOURS
}
