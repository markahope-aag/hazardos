'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, parseISO } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger, formatError } from '@/lib/utils/logger'
import { WeekRow, FilterBar, DayCardContent } from './calendar-grid'
import { parseLocalDate, isEventFinished, shortName, crewLabel, type ViewMode, type EventKind, type CalendarEvent, type CalendarJob, type CalendarSurvey, type ExternalEvent, type IndustryEvent, type RegulatoryDeadline, type TeamMember, DEFAULT_TYPE_FILTER } from './calendar-types'
import { EventDetail } from './calendar-details'
export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [jobs, setJobs] = useState<CalendarJob[]>([])
  const [surveys, setSurveys] = useState<CalendarSurvey[]>([])
  const [deadlines, setDeadlines] = useState<RegulatoryDeadline[]>([])
  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>([])
  const [industryEvents, setIndustryEvents] = useState<IndustryEvent[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const [typeFilter, setTypeFilter] = useState<Record<EventKind, boolean>>(DEFAULT_TYPE_FILTER)
  const [memberFilter, setMemberFilter] = useState<string>('all')
  const [showCompleted, setShowCompleted] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let start: Date, end: Date

      if (viewMode === 'month') {
        start = startOfWeek(startOfMonth(currentDate))
        end = endOfWeek(endOfMonth(currentDate))
      } else if (viewMode === 'week') {
        start = startOfWeek(currentDate)
        end = endOfWeek(currentDate)
      } else {
        start = currentDate
        end = currentDate
      }

      const startParam = format(start, 'yyyy-MM-dd')
      const endParam = format(end, 'yyyy-MM-dd')

      // Pull every event source in parallel. A failure on any one
      // shouldn't blank the calendar — surveys/deadlines/external
      // each fall back to empty.
      const [jobsRes, surveysRes, deadlinesRes, externalRes, industryRes] = await Promise.all([
        fetch(`/api/jobs/calendar?start=${startParam}&end=${endParam}`),
        fetch(`/api/site-surveys/calendar?start=${startParam}&end=${endParam}`),
        fetch(`/api/calendar/regulatory-deadlines?start=${startParam}&end=${endParam}`),
        fetch(`/api/calendar/external-events?start=${startParam}&end=${endParam}`),
        fetch(`/api/calendar/industry-events?start=${startParam}&end=${endParam}`),
      ])

      const jobsData = await jobsRes.json().catch(() => ({}))
      const jobsList = Array.isArray(jobsData) ? jobsData : jobsData.jobs || []
      setJobs(jobsList)

      if (surveysRes.ok) {
        const data = await surveysRes.json().catch(() => ({ surveys: [] }))
        setSurveys(data.surveys || [])
      } else {
        setSurveys([])
      }

      if (deadlinesRes.ok) {
        const data = await deadlinesRes.json().catch(() => ({ deadlines: [] }))
        setDeadlines(data.deadlines || [])
      } else {
        setDeadlines([])
      }

      if (externalRes.ok) {
        const data = await externalRes.json().catch(() => ({ google: [] }))
        setExternalEvents(data.google || [])
      } else {
        setExternalEvents([])
      }

      if (industryRes.ok) {
        const data = await industryRes.json().catch(() => ({ events: [] }))
        setIndustryEvents(data.events || [])
      } else {
        setIndustryEvents([])
      }
    } catch (error) {
      logger.error(
        { error: formatError(error, 'CALENDAR_FETCH_ERROR') },
        'Failed to fetch calendar data'
      )
    } finally {
      setLoading(false)
    }
  }, [currentDate, viewMode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Buttons that sit above the calendar (import event series, schedule a
  // survey) dispatch one of these after a successful write so the grid
  // refetches immediately instead of waiting for the user to navigate.
  useEffect(() => {
    const handler = () => fetchData()
    window.addEventListener('industry-events-imported', handler)
    window.addEventListener('calendar-refresh', handler)
    return () => {
      window.removeEventListener('industry-events-imported', handler)
      window.removeEventListener('calendar-refresh', handler)
    }
  }, [fetchData])

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []))
      .catch(() => setMembers([]))
  }, [])

  // Normalize every source into a single CalendarEvent shape so
  // filtering and rendering don't have to branch on type per cell.
  const allEvents = useMemo<CalendarEvent[]>(() => {
    const out: CalendarEvent[] = []

    for (const job of jobs) {
      const start = parseLocalDate(job.scheduled_start_date)
      const end = job.scheduled_end_date ? parseLocalDate(job.scheduled_end_date) : start
      const assigneeIds = (job.crew || [])
        .map((c) => c.profile?.id)
        .filter((x): x is string => Boolean(x))
      // Lead with who's going. Color alone can't be read out loud, and the
      // chip truncates from the right, so the name has to come first to
      // survive in the month grid.
      const crew = crewLabel(job.crew)
      out.push({
        id: `job-${job.id}`,
        kind: 'job',
        title: crew ? `${crew} · ${job.job_number}` : job.job_number,
        startDate: start,
        endDate: end,
        startTime: job.scheduled_start_time,
        assigneeIds,
        raw: { kind: 'job', job },
      })
    }

    for (const survey of surveys) {
      const d = parseLocalDate(survey.scheduled_date)
      const who = shortName(survey.assignee?.first_name, survey.assignee?.last_name)
      out.push({
        id: `survey-${survey.id}`,
        kind: 'survey',
        title: who
          ? `${who} · Survey: ${survey.job_name}`
          : `Survey: ${survey.job_name}`,
        startDate: d,
        endDate: d,
        startTime: survey.scheduled_time_start,
        assigneeIds: survey.assigned_to ? [survey.assigned_to] : [],
        raw: { kind: 'survey', survey },
      })
    }

    for (const deadline of deadlines) {
      const d = parseLocalDate(deadline.deadline_date)
      out.push({
        id: deadline.id,
        kind: 'deadline',
        title: deadline.label,
        startDate: d,
        endDate: d,
        startTime: null,
        assigneeIds: [],
        raw: { kind: 'deadline', deadline },
      })
    }

    for (const ev of externalEvents) {
      if (!ev.start) continue
      const start = ev.all_day ? parseLocalDate(ev.start) : parseISO(ev.start)
      const rawEnd = ev.end ? (ev.all_day ? parseLocalDate(ev.end) : parseISO(ev.end)) : start
      // Google all-day ranges use an exclusive end date.
      const end = ev.all_day && ev.end ? addDays(rawEnd, -1) : rawEnd
      out.push({
        id: `ext-${ev.id}`,
        kind: 'external',
        title: ev.summary,
        startDate: start,
        endDate: end,
        startTime: ev.all_day ? null : format(start, 'HH:mm'),
        assigneeIds: [],
        raw: { kind: 'external', event: ev },
      })
    }

    for (const ev of industryEvents) {
      const start = ev.all_day ? parseLocalDate(ev.start_at) : parseISO(ev.start_at)
      const end = ev.all_day ? parseLocalDate(ev.end_at) : parseISO(ev.end_at)
      out.push({
        id: `industry-${ev.id}`,
        kind: 'industry',
        title: ev.title,
        startDate: start,
        endDate: end,
        startTime: ev.all_day ? null : format(start, 'HH:mm'),
        assigneeIds: [],
        raw: { kind: 'industry', event: ev },
      })
    }

    return out
  }, [jobs, surveys, deadlines, externalEvents, industryEvents])

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      if (!typeFilter[ev.kind]) return false
      if (!showCompleted && isEventFinished(ev)) return false
      if (memberFilter !== 'all') {
        // Deadlines have no assignees. Filter them in along with their
        // owning job — practically: keep deadlines when *anything* the
        // user owns lives nearby. Simplest correct rule: hide deadlines
        // when filtering by member, since they're org-wide compliance
        // pins.
        if (ev.kind === 'deadline' || ev.kind === 'external' || ev.kind === 'industry') return false
        if (!ev.assigneeIds.includes(memberFilter)) return false
      }
      return true
    })
  }, [allEvents, typeFilter, memberFilter, showCompleted])

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1))
    } else {
      setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1))
    }
  }

  const goToToday = () => setCurrentDate(new Date())

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const out: CalendarEvent[] = []
    for (const ev of filteredEvents) {
      const inRange =
        isSameDay(ev.startDate, date) ||
        isSameDay(ev.endDate, date) ||
        (date > ev.startDate && date < ev.endDate)
      if (inRange) out.push(ev)
    }
    const order: Record<EventKind, number> = { job: 0, survey: 1, deadline: 2, industry: 3, external: 4 }
    out.sort((a, b) => order[a.kind] - order[b.kind])
    return out
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelected(event)
    setSheetOpen(true)
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    const weekStarts: Date[] = []
    for (let i = 0; i < days.length; i += 7) {
      weekStarts.push(days[i])
    }

    return (
      <div className="rounded-lg overflow-hidden border bg-muted">
        <div className="grid grid-cols-7 gap-px bg-muted">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="bg-background p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="space-y-px">
          {weekStarts.map((weekStart) => (
            <WeekRow
              key={weekStart.toISOString()}
              weekStart={weekStart}
              currentDate={currentDate}
              events={filteredEvents}
              variant="month"
              onEventClick={handleEventClick}
            />
          ))}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate)

    return (
      <div className="rounded-lg overflow-hidden border bg-muted">
        <WeekRow
          weekStart={weekStart}
          currentDate={currentDate}
          events={filteredEvents}
          variant="week"
          onEventClick={handleEventClick}
        />
      </div>
    )
  }

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate)
    const isToday = isSameDay(currentDate, new Date())

    return (
      <div>
        <div
          className={cn(
            'text-center p-4 rounded-lg mb-4',
            isToday ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}
        >
          <div className="text-lg font-medium">{format(currentDate, 'EEEE')}</div>
          <div className="text-4xl font-bold">{format(currentDate, 'MMMM d, yyyy')}</div>
        </div>
        <div className="space-y-3">
          {dayEvents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nothing scheduled for this day.
              </CardContent>
            </Card>
          ) : (
            dayEvents.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleEventClick(event)}
              >
                <CardContent className="p-4">
                  <DayCardContent event={event} />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    )
  }

  const getTitle = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy')
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = endOfWeek(currentDate)
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    }
    return format(currentDate, 'MMMM d, yyyy')
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')} aria-label="Previous period">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('next')} aria-label="Next period">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Today
            </Button>
            <h2 className="text-xl font-semibold ml-2">{getTitle()}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <FilterBar
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          memberFilter={memberFilter}
          setMemberFilter={setMemberFilter}
          showCompleted={showCompleted}
          setShowCompleted={setShowCompleted}
          members={members}
        />

        {loading ? (
          <div className="flex items-center justify-center h-[500px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          {selected && <EventDetail event={selected} />}
        </SheetContent>
      </Sheet>
    </>
  )
}

