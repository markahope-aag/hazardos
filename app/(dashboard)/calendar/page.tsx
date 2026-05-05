'use client'

import dynamic from 'next/dynamic'
import { CalendarSkeleton } from './calendar-skeleton'
import { ImportIndustryEventsButton } from './import-industry-events-button'

// Lazy load CalendarView (contains date-fns and complex client logic)
const CalendarView = dynamic(
  () => import('./calendar-view').then(mod => ({ default: mod.CalendarView })),
  {
    ssr: false,
    loading: () => <CalendarSkeleton />,
  }
)

export default function CalendarPage() {
  return (
    <div className="container py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            View and manage scheduled jobs, surveys, deadlines, and industry events
          </p>
        </div>
        <ImportIndustryEventsButton />
      </div>
      <CalendarView />
    </div>
  )
}
