'use client'

import dynamic from 'next/dynamic'
import { CalendarSkeleton } from '@/app/(dashboard)/calendar/calendar-skeleton'
import { CreateSurveyButton } from '@/app/(dashboard)/site-surveys/create-survey-modal'

/**
 * The same calendar as /calendar, rendered inside the CRM shell.
 *
 * Booking someone starts in the CRM: a caller asks when somebody can come
 * out, and answering that meant leaving the CRM for the main nav and losing
 * the sub-tabs. This keeps the schedule one click from the contact you're
 * looking at, and puts "Schedule Survey" on the same screen as the answer.
 */
const CalendarView = dynamic(
  () => import('@/app/(dashboard)/calendar/calendar-view').then((mod) => ({ default: mod.CalendarView })),
  {
    ssr: false,
    loading: () => <CalendarSkeleton />,
  },
)

export default function CrmCalendarPage() {
  return (
    <div className="py-2">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            Who is booked and when, so you can tell a caller where you have room
            without leaving the CRM.
          </p>
        </div>
        <CreateSurveyButton
          onCreated={() => window.dispatchEvent(new Event('calendar-refresh'))}
        />
      </div>
      <CalendarView />
    </div>
  )
}
