'use client'

import type { ComponentProps } from 'react'
import { TimeSelect } from '@/components/ui/time-select'
import { useBusinessHours } from '@/lib/hooks/use-business-hours'

type ScheduleTimeSelectProps = Omit<ComponentProps<typeof TimeSelect>, 'minTime' | 'maxTime'>

/**
 * A time picker for appointment times, bounded to the organization's working
 * day (Settings → Company Profile → Business hours).
 *
 * Kept separate from TimeSelect so the primitive stays free of data fetching,
 * and so times that legitimately fall outside the workday (SMS quiet hours,
 * a building's occupied hours) keep the full 24-hour list by using TimeSelect
 * directly.
 */
export function ScheduleTimeSelect(props: ScheduleTimeSelectProps) {
  const { start, end } = useBusinessHours()
  return <TimeSelect {...props} minTime={start} maxTime={end} />
}
