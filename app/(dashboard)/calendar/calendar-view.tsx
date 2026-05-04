'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  differenceInCalendarDays,
  parseISO,
} from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Clock,
  User,
  FileText,
  FileSignature,
  Download,
  ExternalLink,
  ClipboardList,
  AlertTriangle,
  CalendarIcon,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { jobStatusConfig } from '@/types/jobs'
import { logger, formatError } from '@/lib/utils/logger'
import Link from 'next/link'
import { useJobDocuments } from '@/lib/hooks/use-job-documents'
import { JobDocumentsService } from '@/lib/supabase/job-documents'
import type { JobDocumentCategory } from '@/types/database'

type ViewMode = 'month' | 'week' | 'day'
type EventKind = 'job' | 'survey' | 'deadline' | 'external'

// Postgres DATE columns come across the wire as bare 'YYYY-MM-DD' strings.
// date-fns' parseISO treats those as UTC midnight per the ISO spec, which
// means in any US timezone the value renders as the previous day locally —
// so a job scheduled for April 19 silently shows up on April 18 (or falls
// off the visible grid). Parse as local-time to pin the calendar day to
// the date the user actually picked.
function parseLocalDate(value: string): Date {
  const [datePart] = value.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

interface CalendarJob {
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

interface CalendarSurvey {
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

interface RegulatoryDeadline {
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

interface ExternalEvent {
  id: string
  summary: string
  start: string | null
  end: string | null
  all_day: boolean
  location: string | null
  html_link: string | null
}

interface TeamMember {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

// Unified event the calendar grid renders. The original record is
// kept on `raw` so the detail Sheet can branch on type without
// re-fetching anything.
interface CalendarEvent {
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
}

const DEFAULT_TYPE_FILTER: Record<EventKind, boolean> = {
  job: true,
  survey: true,
  deadline: true,
  external: true,
}

// Statuses that mean the work is finished — hidden by default so the
// calendar shows what's still on the books, not the archive.
const FINISHED_JOB_STATUSES = new Set([
  'completed',
  'invoiced',
  'paid',
  'closed',
  'cancelled',
])
const FINISHED_SURVEY_STATUSES = new Set(['completed', 'cancelled'])
const FINISHED_APPOINTMENT_STATUSES = new Set(['completed', 'cancelled', 'no_show'])

function isEventFinished(event: CalendarEvent): boolean {
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
const LANE_HEIGHT = 22
const MAX_LANES_MONTH = 4
const MAX_LANES_WEEK = 18

interface PlacedBand {
  event: CalendarEvent
  startCol: number // 0-6 within the week
  endCol: number // 0-6 within the week
  lane: number
  isStart: boolean // event begins on or after this week's start
  isEnd: boolean // event ends on or before this week's end
}

// Greedy lane assignment: longer events go first so they win lower
// lanes and stay anchored to the top of the row. Ties break by start
// date so order is stable across re-renders.
function layoutWeek(events: CalendarEvent[], weekStart: Date, weekEnd: Date): PlacedBand[] {
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

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [jobs, setJobs] = useState<CalendarJob[]>([])
  const [surveys, setSurveys] = useState<CalendarSurvey[]>([])
  const [deadlines, setDeadlines] = useState<RegulatoryDeadline[]>([])
  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>([])
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
      const [jobsRes, surveysRes, deadlinesRes, externalRes] = await Promise.all([
        fetch(`/api/jobs/calendar?start=${startParam}&end=${endParam}`),
        fetch(`/api/site-surveys/calendar?start=${startParam}&end=${endParam}`),
        fetch(`/api/calendar/regulatory-deadlines?start=${startParam}&end=${endParam}`),
        fetch(`/api/calendar/external-events?start=${startParam}&end=${endParam}`),
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
      out.push({
        id: `job-${job.id}`,
        kind: 'job',
        title: job.job_number,
        startDate: start,
        endDate: end,
        startTime: job.scheduled_start_time,
        assigneeIds,
        raw: { kind: 'job', job },
      })
    }

    for (const survey of surveys) {
      const d = parseLocalDate(survey.scheduled_date)
      out.push({
        id: `survey-${survey.id}`,
        kind: 'survey',
        title: `Survey: ${survey.job_name}`,
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

    return out
  }, [jobs, surveys, deadlines, externalEvents])

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
        if (ev.kind === 'deadline' || ev.kind === 'external') return false
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
    const order: Record<EventKind, number> = { job: 0, survey: 1, deadline: 2, external: 3 }
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
            <Button asChild>
              <Link href={`/jobs/new?date=${format(currentDate, 'yyyy-MM-dd')}`}>
                <Plus className="h-4 w-4 mr-2" />
                New Job
              </Link>
            </Button>
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

function WeekRow({
  weekStart,
  currentDate,
  events,
  variant,
  onEventClick,
}: {
  weekStart: Date
  currentDate: Date
  events: CalendarEvent[]
  variant: 'month' | 'week'
  onEventClick: (event: CalendarEvent) => void
}) {
  const weekEnd = endOfWeek(weekStart)
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const placed = layoutWeek(events, weekStart, weekEnd)
  const maxLanes = variant === 'month' ? MAX_LANES_MONTH : MAX_LANES_WEEK
  const visible = placed.filter((p) => p.lane < maxLanes)
  const overflow = days.map((_, col) =>
    placed.filter((p) => p.lane >= maxLanes && p.startCol <= col && p.endCol >= col).length,
  )

  // Pixel offsets the band overlay layer needs so bands don't collide
  // with the date number on each cell.
  const bandsTop = variant === 'month' ? 36 : 78
  const bandsHeight = maxLanes * LANE_HEIGHT
  const cellMinHeight = variant === 'month' ? bandsTop + bandsHeight + 24 : bandsTop + bandsHeight + 16

  return (
    <div className="relative grid grid-cols-7 gap-px bg-muted">
      {days.map((day, col) => {
        const isToday = isSameDay(day, new Date())
        const isCurrentMonth = isSameMonth(day, currentDate)
        return (
          <div
            key={day.toISOString()}
            className={cn(
              'bg-background p-2 flex flex-col',
              variant === 'month' && !isCurrentMonth && 'bg-muted/40',
            )}
            style={{ minHeight: `${cellMinHeight}px` }}
          >
            {variant === 'month' ? (
              <div
                className={cn(
                  'text-sm font-medium',
                  isToday &&
                    'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center',
                  !isCurrentMonth && 'text-muted-foreground',
                )}
              >
                {format(day, 'd')}
              </div>
            ) : (
              <div
                className={cn(
                  'text-center -m-2 mb-0 p-2 rounded-t',
                  isToday ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                <div className="text-2xl font-bold leading-tight">{format(day, 'd')}</div>
              </div>
            )}
            <div style={{ height: `${bandsHeight}px` }} aria-hidden="true" />
            {overflow[col] > 0 && (
              <div className="text-xs text-muted-foreground mt-auto">
                +{overflow[col]} more
              </div>
            )}
          </div>
        )
      })}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top: `${bandsTop}px`, height: `${bandsHeight}px` }}
      >
        {visible.map((band) => (
          <EventBand
            key={`${band.event.id}-${band.lane}`}
            band={band}
            onClick={() => onEventClick(band.event)}
            style={{
              left: `calc(${(band.startCol / 7) * 100}% + 4px)`,
              width: `calc(${((band.endCol - band.startCol + 1) / 7) * 100}% - 8px)`,
              top: `${band.lane * LANE_HEIGHT}px`,
              height: `${LANE_HEIGHT - 3}px`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function EventBand({
  band,
  onClick,
  style,
}: {
  band: PlacedBand
  onClick: () => void
  style: React.CSSProperties
}) {
  const { event, isStart, isEnd } = band

  let bgClass = 'bg-gray-200 text-gray-800'
  let icon: React.ReactNode = null

  if (event.raw.kind === 'job') {
    const statusConfig = jobStatusConfig[event.raw.job.status as keyof typeof jobStatusConfig]
    bgClass = cn(statusConfig?.bgColor || 'bg-blue-100', statusConfig?.color || 'text-blue-900')
  } else if (event.kind === 'survey') {
    bgClass = 'bg-purple-100 text-purple-900 border-l-2 border-purple-500'
    icon = <ClipboardList className="h-3 w-3 inline mr-1 flex-shrink-0" />
  } else if (event.kind === 'deadline') {
    bgClass = 'bg-red-50 text-red-800 border border-red-300'
    icon = <AlertTriangle className="h-3 w-3 inline mr-1 flex-shrink-0" />
  } else if (event.kind === 'external') {
    bgClass = 'bg-white text-gray-700 border border-dashed border-gray-300'
    icon = <CalendarIcon className="h-3 w-3 inline mr-1 flex-shrink-0" />
  }

  const externalLink =
    event.raw.kind === 'external' ? event.raw.event.html_link || undefined : undefined

  const className = cn(
    'pointer-events-auto absolute text-left text-xs px-2 truncate transition-opacity hover:opacity-80 flex items-center',
    bgClass,
    isStart && isEnd && 'rounded',
    isStart && !isEnd && 'rounded-l',
    !isStart && isEnd && 'rounded-r',
  )

  const inner = isStart ? (
    <span className="flex items-center min-w-0">
      {icon}
      {event.startTime && (
        <span className="font-medium mr-1 flex-shrink-0">
          {format(parseISO(`2000-01-01T${event.startTime}`), 'h:mma')}
        </span>
      )}
      <span className="truncate">{event.title}</span>
    </span>
  ) : (
    <span className="opacity-50 truncate">{event.title}</span>
  )

  if (event.kind === 'external' && externalLink) {
    return (
      <a
        href={externalLink}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
        title={event.title}
      >
        {inner}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className} style={style} title={event.title}>
      {inner}
    </button>
  )
}

function FilterBar({
  typeFilter,
  setTypeFilter,
  memberFilter,
  setMemberFilter,
  showCompleted,
  setShowCompleted,
  members,
}: {
  typeFilter: Record<EventKind, boolean>
  setTypeFilter: (v: Record<EventKind, boolean>) => void
  memberFilter: string
  setMemberFilter: (v: string) => void
  showCompleted: boolean
  setShowCompleted: (v: boolean) => void
  members: TeamMember[]
}) {
  const toggle = (kind: EventKind) => {
    setTypeFilter({ ...typeFilter, [kind]: !typeFilter[kind] })
  }

  const chip = (kind: EventKind, label: string, swatchClass: string, icon?: React.ReactNode) => (
    <button
      type="button"
      onClick={() => toggle(kind)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        typeFilter[kind]
          ? 'bg-foreground text-background border-foreground'
          : 'bg-background text-muted-foreground border-border hover:bg-muted',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', swatchClass)} />
      {icon}
      {label}
    </button>
  )

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground mr-1">Show:</span>
      {chip('job', 'Jobs', 'bg-blue-500')}
      {chip('survey', 'Surveys', 'bg-purple-500', <ClipboardList className="h-3 w-3" />)}
      {chip('deadline', 'Deadlines', 'bg-red-500', <AlertTriangle className="h-3 w-3" />)}
      {chip('external', 'External', 'bg-gray-400', <CalendarIcon className="h-3 w-3" />)}

      <button
        type="button"
        onClick={() => setShowCompleted(!showCompleted)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
          showCompleted
            ? 'bg-foreground text-background border-foreground'
            : 'bg-background text-muted-foreground border-border hover:bg-muted',
        )}
        title={
          showCompleted
            ? 'Hide finished jobs and surveys'
            : 'Include completed, paid, invoiced, closed, and cancelled events'
        }
      >
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </button>

      <span className="ml-3 text-xs font-medium text-muted-foreground">Team member:</span>
      <Select value={memberFilter} onValueChange={setMemberFilter}>
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Everyone</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {[m.first_name, m.last_name].filter(Boolean).join(' ') || m.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function DayCardContent({ event }: { event: CalendarEvent }) {
  if (event.raw.kind === 'job') {
    const job = event.raw.job
    const statusConfig = jobStatusConfig[job.status as keyof typeof jobStatusConfig]
    return (
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold">{job.job_number}</span>
            <Badge className={cn(statusConfig?.bgColor, statusConfig?.color)}>
              {statusConfig?.label || job.status}
            </Badge>
          </div>
          {job.name && <p className="text-muted-foreground">{job.name}</p>}
          {job.customer && (
            <p className="text-sm mt-2">
              <User className="h-4 w-4 inline mr-1" />
              {job.customer.company_name || job.customer.name}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4 inline mr-1" />
            {job.job_address}
            {job.job_city && `, ${job.job_city}`}
          </p>
        </div>
        <div className="text-right">
          {job.scheduled_start_time && (
            <div className="font-medium">
              {format(parseISO(`2000-01-01T${job.scheduled_start_time}`), 'h:mm a')}
            </div>
          )}
          {job.estimated_duration_hours && (
            <div className="text-sm text-muted-foreground">
              <Clock className="h-4 w-4 inline mr-1" />
              {job.estimated_duration_hours}h
            </div>
          )}
        </div>
      </div>
    )
  }

  if (event.raw.kind === 'survey') {
    const s = event.raw.survey
    return (
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-4 w-4 text-purple-600" />
            <span className="font-bold">{s.job_name}</span>
            <Badge variant="outline" className="border-purple-300 text-purple-800">
              Survey
            </Badge>
          </div>
          <p className="text-sm">{s.customer_name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4 inline mr-1" />
            {s.site_address}
            {s.site_city && `, ${s.site_city}`}
          </p>
        </div>
        <div className="text-right">
          {s.scheduled_time_start && (
            <div className="font-medium">
              {format(parseISO(`2000-01-01T${s.scheduled_time_start}`), 'h:mm a')}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (event.raw.kind === 'deadline') {
    const d = event.raw.deadline
    return (
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-bold text-red-900">{d.label}</div>
          <p className="text-sm text-muted-foreground mt-1">
            For {d.job_number}
            {d.job_name ? ` — ${d.job_name}` : ''}
            {d.customer_name ? ` (${d.customer_name})` : ''}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Job starts {format(parseLocalDate(d.job_start_date), 'EEE MMM d')}
          </p>
        </div>
      </div>
    )
  }

  if (event.raw.kind === 'external') {
    const ev = event.raw.event
    return (
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold">{ev.summary}</span>
            <Badge variant="outline">Google Calendar</Badge>
          </div>
          {ev.location && (
            <p className="text-sm text-muted-foreground mt-1">
              <MapPin className="h-4 w-4 inline mr-1" />
              {ev.location}
            </p>
          )}
        </div>
        <div className="text-right text-sm">
          {!ev.all_day && ev.start && (
            <div className="font-medium">{format(parseISO(ev.start), 'h:mm a')}</div>
          )}
          {ev.all_day && <div className="text-muted-foreground">All day</div>}
        </div>
      </div>
    )
  }

  return null
}

function EventDetail({ event }: { event: CalendarEvent }) {
  if (event.raw.kind === 'job') return <JobDetail job={event.raw.job} />
  if (event.raw.kind === 'survey') return <SurveyDetail survey={event.raw.survey} />
  if (event.raw.kind === 'deadline') return <DeadlineDetail deadline={event.raw.deadline} />
  if (event.raw.kind === 'external') return <ExternalDetail event={event.raw.event} />
  return null
}

function JobDetail({ job }: { job: CalendarJob }) {
  const statusConfig = jobStatusConfig[job.status as keyof typeof jobStatusConfig]
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          {job.job_number}
          <Badge className={cn(statusConfig?.bgColor, statusConfig?.color)}>
            {statusConfig?.label || job.status}
          </Badge>
        </SheetTitle>
        <SheetDescription>{job.name || 'Job Details'}</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Scheduled</h4>
          <p className="mt-1">
            {format(parseLocalDate(job.scheduled_start_date), 'MMMM d, yyyy')}
            {job.scheduled_end_date && job.scheduled_end_date !== job.scheduled_start_date && (
              <> – {format(parseLocalDate(job.scheduled_end_date), 'MMMM d, yyyy')}</>
            )}
            {job.scheduled_start_time && (
              <> at {format(parseISO(`2000-01-01T${job.scheduled_start_time}`), 'h:mm a')}</>
            )}
          </p>
        </div>
        {job.customer && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Customer</h4>
            <p className="mt-1">{job.customer.company_name || job.customer.name}</p>
          </div>
        )}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
          <p className="mt-1">
            {job.job_address}
            {job.job_city && <>, {job.job_city}</>}
          </p>
        </div>

        <SelectedJobAttachments jobId={job.id} proposalId={job.proposal_id} />

        <div className="pt-4">
          <Button asChild className="w-full">
            <Link href={`/jobs/${job.id}`}>View Job</Link>
          </Button>
        </div>
      </div>
    </>
  )
}

function SurveyDetail({ survey }: { survey: CalendarSurvey }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-purple-600" />
          {survey.job_name}
          <Badge variant="outline" className="border-purple-300 text-purple-800">
            Survey
          </Badge>
        </SheetTitle>
        <SheetDescription>
          {survey.hazard_type ? `${survey.hazard_type} survey` : 'Site survey'}
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Scheduled</h4>
          <p className="mt-1">
            {format(parseLocalDate(survey.scheduled_date), 'MMMM d, yyyy')}
            {survey.scheduled_time_start && (
              <> at {format(parseISO(`2000-01-01T${survey.scheduled_time_start}`), 'h:mm a')}</>
            )}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Customer</h4>
          <p className="mt-1">{survey.customer_name}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
          <p className="mt-1">
            {survey.site_address}
            {survey.site_city && <>, {survey.site_city}</>}
          </p>
        </div>
        {survey.assignee && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Assigned to</h4>
            <p className="mt-1">
              {[survey.assignee.first_name, survey.assignee.last_name].filter(Boolean).join(' ')}
            </p>
          </div>
        )}
        <div className="pt-4">
          <Button asChild className="w-full">
            <Link href={`/site-surveys/${survey.id}`}>View Survey</Link>
          </Button>
        </div>
      </div>
    </>
  )
}

function DeadlineDetail({ deadline }: { deadline: RegulatoryDeadline }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2 text-red-900">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          {deadline.label}
        </SheetTitle>
        <SheetDescription>Compliance deadline derived from job schedule</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          The EPA NESHAP rule requires written notification to the relevant agency
          <strong> 10 working days </strong>
          before any asbestos abatement begins. Missing this is a per-day fine.
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Due</h4>
          <p className="mt-1 font-medium">
            {format(parseLocalDate(deadline.deadline_date), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Job</h4>
          <p className="mt-1">
            {deadline.job_number}
            {deadline.job_name ? ` — ${deadline.job_name}` : ''}
          </p>
          {deadline.customer_name && (
            <p className="text-sm text-muted-foreground">{deadline.customer_name}</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Job starts</h4>
          <p className="mt-1">{format(parseLocalDate(deadline.job_start_date), 'MMMM d, yyyy')}</p>
        </div>
        <div className="pt-4">
          <Button asChild className="w-full">
            <Link href={`/jobs/${deadline.job_id}`}>Open Job</Link>
          </Button>
        </div>
      </div>
    </>
  )
}

function ExternalDetail({ event }: { event: ExternalEvent }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          {event.summary}
          <Badge variant="outline">Google Calendar</Badge>
        </SheetTitle>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        {event.start && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">When</h4>
            <p className="mt-1">
              {event.all_day ? (
                'All day'
              ) : (
                format(parseISO(event.start), 'MMM d, yyyy h:mm a')
              )}
            </p>
          </div>
        )}
        {event.location && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
            <p className="mt-1">{event.location}</p>
          </div>
        )}
        {event.html_link && (
          <div className="pt-4">
            <Button asChild variant="outline" className="w-full">
              <a href={event.html_link} target="_blank" rel="noopener noreferrer">
                Open in Google Calendar
                <ExternalLink className="h-3.5 w-3.5 ml-2" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

const CATEGORY_LABEL: Record<JobDocumentCategory, string> = {
  permit: 'Permit',
  manifest: 'Waste manifest',
  clearance: 'Clearance report',
  air_monitoring: 'Air monitoring',
  insurance: 'Insurance (COI)',
  regulatory: 'Regulatory notification',
  customer_signoff: 'Customer sign-off',
  correspondence: 'Correspondence',
  video: 'Video',
  daily_log: 'Daily log',
  opp: 'OPP',
  other: 'Other',
}

// Small block embedded in the calendar's job popup. Pulls the job's
// documents from the DB and surfaces the linked proposal (if any) so
// the user doesn't have to open the full job detail page just to grab
// a permit or send the proposal.
function SelectedJobAttachments({
  jobId,
  proposalId,
}: {
  jobId: string
  proposalId: string | null
}) {
  const { data: documents = [], isLoading } = useJobDocuments(jobId)

  const handleOpen = async (storagePath: string) => {
    try {
      const url = await JobDocumentsService.getSignedUrl(storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // Errors surface through the hook's toast on the full tab; here
      // we silently swallow so the popup doesn't steal focus.
    }
  }

  return (
    <div className="border-t pt-4 space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Attachments</h4>

      {proposalId && (
        <Link
          href={`/proposals/${proposalId}`}
          className="flex items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
        >
          <span className="flex items-center gap-2 min-w-0">
            <FileSignature className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate">Proposal</span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      )}

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading documents…</div>
      ) : documents.length === 0 ? (
        !proposalId && (
          <div className="text-xs text-muted-foreground">
            No documents attached. Open the job to upload permits, manifests, videos, etc.
          </div>
        )
      ) : (
        <ul className="space-y-1">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => handleOpen(doc.storage_path)}
                className="flex items-center justify-between gap-2 w-full rounded border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 text-left"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{doc.file_name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    {CATEGORY_LABEL[doc.category]}
                  </span>
                </span>
                <Download className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
