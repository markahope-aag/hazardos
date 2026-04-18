'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { jobStatusConfig } from '@/types/jobs'
import { logger, formatError } from '@/lib/utils/logger'
import Link from 'next/link'

type ViewMode = 'month' | 'week' | 'day'

interface CalendarJob {
  id: string
  job_number: string
  name: string | null
  status: string
  scheduled_start_date: string
  scheduled_start_time: string | null
  scheduled_end_date: string | null
  estimated_duration_hours: number | null
  job_address: string
  job_city: string | null
  customer: {
    id: string
    name: string
    company_name: string | null
  } | null
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

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [jobs, setJobs] = useState<CalendarJob[]>([])
  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<CalendarJob | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const fetchJobs = useCallback(async () => {
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

      // Jobs and external (Google) events are fetched in parallel. A Google
      // outage or a disconnected integration shouldn't break the jobs view —
      // the external-events endpoint returns an empty list in that case.
      const [jobsRes, externalRes] = await Promise.all([
        fetch(`/api/jobs/calendar?start=${startParam}&end=${endParam}`),
        fetch(`/api/calendar/external-events?start=${startParam}&end=${endParam}`),
      ])

      const jobsData = await jobsRes.json()
      const jobsList = Array.isArray(jobsData) ? jobsData : jobsData.jobs || []
      setJobs(jobsList)

      if (externalRes.ok) {
        const externalData = await externalRes.json()
        setExternalEvents(externalData.google || [])
      } else {
        setExternalEvents([])
      }
    } catch (error) {
      logger.error(
        { error: formatError(error, 'CALENDAR_FETCH_ERROR') },
        'Failed to fetch calendar jobs'
      )
    } finally {
      setLoading(false)
    }
  }, [currentDate, viewMode])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

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

  const getJobsForDate = (date: Date) => {
    // Multi-day jobs (e.g. a 5-day abatement project) need to appear on every
    // day they're scheduled, not just the start date.
    return jobs.filter((job) => {
      const start = parseISO(job.scheduled_start_date)
      const end = job.scheduled_end_date ? parseISO(job.scheduled_end_date) : start
      if (isSameDay(start, date) || isSameDay(end, date)) return true
      return date > start && date < end
    })
  }

  const getExternalEventsForDate = (date: Date) => {
    return externalEvents.filter((e) => {
      if (!e.start) return false
      const start = parseISO(e.start)
      const end = e.end ? parseISO(e.end) : start
      // Google all-day ranges use an exclusive end date, so subtract one day
      // from the end for "is this event on this day" checks when all-day.
      const effectiveEnd = e.all_day && e.end ? addDays(end, -1) : end
      if (isSameDay(start, date) || isSameDay(effectiveEnd, date)) return true
      return date > start && date < effectiveEnd
    })
  }

  const handleJobClick = (job: CalendarJob) => {
    setSelectedJob(job)
    setSheetOpen(true)
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return (
      <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-background p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {days.map(day => {
          const dayJobs = getJobsForDate(day)
          const dayExternal = getExternalEventsForDate(day)
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, currentDate)

          const totalItems = dayJobs.length + dayExternal.length
          const MAX = 3
          const visibleJobs = dayJobs.slice(0, MAX)
          const remainingSlots = Math.max(0, MAX - visibleJobs.length)
          const visibleExternal = dayExternal.slice(0, remainingSlots)
          const overflow = totalItems - visibleJobs.length - visibleExternal.length

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'bg-background min-h-[120px] p-2',
                !isCurrentMonth && 'bg-muted/50'
              )}
            >
              <div className={cn(
                'text-sm font-medium mb-1',
                isToday && 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center',
                !isCurrentMonth && 'text-muted-foreground'
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {visibleJobs.map(job => {
                  const statusConfig = jobStatusConfig[job.status as keyof typeof jobStatusConfig]
                  return (
                    <button
                      key={job.id}
                      onClick={() => handleJobClick(job)}
                      className={cn(
                        'w-full text-left text-xs p-1 rounded truncate',
                        statusConfig?.bgColor || 'bg-gray-100',
                        statusConfig?.color || 'text-gray-800',
                        'hover:opacity-80 transition-opacity'
                      )}
                    >
                      {job.scheduled_start_time && (
                        <span className="font-medium">
                          {format(parseISO(`2000-01-01T${job.scheduled_start_time}`), 'h:mma')}
                        </span>
                      )}{' '}
                      {job.job_number}
                    </button>
                  )
                })}
                {visibleExternal.map((event) => (
                  <a
                    key={event.id}
                    href={event.html_link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-left text-xs p-1 rounded truncate bg-white text-gray-700 border border-dashed border-gray-300 hover:bg-gray-50"
                    title={`Google Calendar: ${event.summary}`}
                  >
                    {!event.all_day && event.start && (
                      <span className="font-medium">
                        {format(parseISO(event.start), 'h:mma')}
                      </span>
                    )}{' '}
                    {event.summary}
                  </a>
                ))}
                {overflow > 0 && (
                  <div className="text-xs text-muted-foreground">
                    +{overflow} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate)
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate) })

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayJobs = getJobsForDate(day)
          const dayExternal = getExternalEventsForDate(day)
          const isToday = isSameDay(day, new Date())

          return (
            <div key={day.toISOString()} className="min-h-[400px]">
              <div className={cn(
                'text-center p-2 rounded-t-lg',
                isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                <div className="text-2xl font-bold">{format(day, 'd')}</div>
              </div>
              <div className="border border-t-0 rounded-b-lg p-2 space-y-2 min-h-[350px]">
                {dayJobs.map(job => {
                  const statusConfig = jobStatusConfig[job.status as keyof typeof jobStatusConfig]
                  return (
                    <button
                      key={job.id}
                      onClick={() => handleJobClick(job)}
                      className={cn(
                        'w-full text-left p-2 rounded text-sm',
                        statusConfig?.bgColor || 'bg-gray-100',
                        statusConfig?.color || 'text-gray-800',
                        'hover:opacity-80 transition-opacity'
                      )}
                    >
                      <div className="font-medium">{job.job_number}</div>
                      {job.scheduled_start_time && (
                        <div className="text-xs opacity-80">
                          {format(parseISO(`2000-01-01T${job.scheduled_start_time}`), 'h:mm a')}
                        </div>
                      )}
                      {job.customer && (
                        <div className="text-xs truncate mt-1">
                          {job.customer.company_name || job.customer.name}
                        </div>
                      )}
                    </button>
                  )
                })}
                {dayExternal.map((event) => (
                  <a
                    key={event.id}
                    href={event.html_link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-left p-2 rounded text-sm bg-white border border-dashed border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <div className="font-medium truncate">{event.summary}</div>
                    {!event.all_day && event.start && (
                      <div className="text-xs opacity-80">
                        {format(parseISO(event.start), 'h:mm a')}
                      </div>
                    )}
                    <div className="text-[10px] uppercase tracking-wide opacity-60 mt-1">
                      Google Calendar
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderDayView = () => {
    const dayJobs = getJobsForDate(currentDate)
    const dayExternal = getExternalEventsForDate(currentDate)
    const isToday = isSameDay(currentDate, new Date())
    const nothingScheduled = dayJobs.length === 0 && dayExternal.length === 0

    return (
      <div>
        <div className={cn(
          'text-center p-4 rounded-lg mb-4',
          isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          <div className="text-lg font-medium">{format(currentDate, 'EEEE')}</div>
          <div className="text-4xl font-bold">{format(currentDate, 'MMMM d, yyyy')}</div>
        </div>
        <div className="space-y-3">
          {nothingScheduled ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nothing scheduled for this day.
              </CardContent>
            </Card>
          ) : (
            <>
              {dayJobs.map(job => {
                const statusConfig = jobStatusConfig[job.status as keyof typeof jobStatusConfig]
                return (
                  <Card
                    key={job.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleJobClick(job)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">{job.job_number}</span>
                            <Badge className={cn(statusConfig?.bgColor, statusConfig?.color)}>
                              {statusConfig?.label || job.status}
                            </Badge>
                          </div>
                          {job.name && (
                            <p className="text-muted-foreground">{job.name}</p>
                          )}
                          {job.customer && (
                            <p className="text-sm mt-2">
                              <User className="h-4 w-4 inline mr-1" />
                              {job.customer.company_name || job.customer.name}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            <MapPin className="h-4 w-4 inline mr-1" />
                            {job.job_address}{job.job_city && `, ${job.job_city}`}
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
                    </CardContent>
                  </Card>
                )
              })}
              {dayExternal.map((event) => (
                <Card
                  key={event.id}
                  className="border-dashed cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <a
                      href={event.html_link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">{event.summary}</span>
                            <Badge variant="outline">Google Calendar</Badge>
                          </div>
                          {event.location && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <MapPin className="h-4 w-4 inline mr-1" />
                              {event.location}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          {!event.all_day && event.start && (
                            <div className="font-medium">
                              {format(parseISO(event.start), 'h:mm a')}
                            </div>
                          )}
                          {event.all_day && (
                            <div className="text-muted-foreground">All day</div>
                          )}
                        </div>
                      </div>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </>
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
        <div className="flex items-center justify-between">
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
          {selectedJob && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedJob.job_number}
                  <Badge className={cn(
                    jobStatusConfig[selectedJob.status as keyof typeof jobStatusConfig]?.bgColor,
                    jobStatusConfig[selectedJob.status as keyof typeof jobStatusConfig]?.color
                  )}>
                    {jobStatusConfig[selectedJob.status as keyof typeof jobStatusConfig]?.label || selectedJob.status}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {selectedJob.name || 'Job Details'}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Scheduled</h4>
                  <p className="mt-1">
                    {format(parseISO(selectedJob.scheduled_start_date), 'MMMM d, yyyy')}
                    {selectedJob.scheduled_start_time && (
                      <> at {format(parseISO(`2000-01-01T${selectedJob.scheduled_start_time}`), 'h:mm a')}</>
                    )}
                  </p>
                </div>
                {selectedJob.estimated_duration_hours && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Duration</h4>
                    <p className="mt-1">{selectedJob.estimated_duration_hours} hours</p>
                  </div>
                )}
                {selectedJob.customer && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Customer</h4>
                    <p className="mt-1">{selectedJob.customer.company_name || selectedJob.customer.name}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
                  <p className="mt-1">
                    {selectedJob.job_address}
                    {selectedJob.job_city && <>, {selectedJob.job_city}</>}
                  </p>
                </div>
                <div className="pt-4">
                  <Button asChild className="w-full">
                    <Link href={`/jobs/${selectedJob.id}`}>
                      View Job Details
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
