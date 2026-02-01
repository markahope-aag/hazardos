'use client'

import dynamic from 'next/dynamic'
import { CalendarSkeleton } from './calendar-skeleton'

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">
          View and manage scheduled jobs
        </p>
      </div>
      <CalendarView />
    </div>
  )
}
