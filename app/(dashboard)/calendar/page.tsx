'use client'

import { Suspense } from 'react'
import { CalendarView } from './calendar-view'
import { CalendarSkeleton } from './calendar-skeleton'

export default function CalendarPage() {
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">
          View and manage scheduled jobs
        </p>
      </div>
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarView />
      </Suspense>
    </div>
  )
}
