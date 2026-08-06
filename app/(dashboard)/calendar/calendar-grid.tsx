'use client'

import { format, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Clock, User, ClipboardList, AlertTriangle, CalendarIcon, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { jobStatusConfig } from '@/types/jobs'
import { layoutWeek, parseLocalDate, type EventKind, type CalendarEvent, type PlacedBand, type TeamMember, LANE_HEIGHT, MAX_LANES_MONTH, MAX_LANES_WEEK, INDUSTRY_CATEGORY_LABELS } from './calendar-types'
/**
 * Month/week grid presentation split out of calendar-view.tsx: the week row,
 * the multi-day event band, the filter bar and the day-cell contents. Leaf
 * components, no data fetching.
 */

export function WeekRow({
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

export function EventBand({
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
  } else if (event.kind === 'industry') {
    bgClass = 'bg-amber-50 text-amber-900 border-l-2 border-amber-500'
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

export function FilterBar({
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
      {chip('industry', 'Industry', 'bg-amber-500', <CalendarIcon className="h-3 w-3" />)}
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

export function DayCardContent({ event }: { event: CalendarEvent }) {
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

  if (event.raw.kind === 'industry') {
    const ev = event.raw.event
    return (
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarIcon className="h-4 w-4 text-amber-600" />
            <span className="font-bold">{ev.title}</span>
            <Badge variant="outline" className="border-amber-300 text-amber-900">
              {INDUSTRY_CATEGORY_LABELS[ev.category] || 'Industry'}
            </Badge>
          </div>
          {ev.location && (
            <p className="text-sm text-muted-foreground mt-1">
              <MapPin className="h-4 w-4 inline mr-1" />
              {ev.location}
            </p>
          )}
        </div>
        <div className="text-right text-sm">
          {!ev.all_day && (
            <div className="font-medium">{format(parseISO(ev.start_at), 'h:mm a')}</div>
          )}
          {ev.all_day && <div className="text-muted-foreground">All day</div>}
        </div>
      </div>
    )
  }

  return null
}

