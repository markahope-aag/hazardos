'use client'

import React, { useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  mode?: 'single' | 'multiple' | 'range'
  onSelect?: (date: Date | undefined) => void
  selected?: Date
  disabled?: (date: Date) => boolean
  initialFocus?: boolean
}

// Lightweight month-grid date picker. Used inside a Popover from the
// New Invoice / New Job / New Opportunity screens; previously shipped as
// a literal "Calendar component placeholder" string, which is why those
// three forms couldn't select a due date. Built on date-fns (already a
// dependency) so there's no net new install.
export function Calendar({
  mode: _mode = 'single',
  onSelect,
  selected,
  disabled,
  initialFocus: _initialFocus,
  className,
  ...props
}: CalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(selected ?? new Date())

  const monthStart = startOfMonth(visibleMonth)
  const monthEnd = endOfMonth(visibleMonth)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const handlePick = (day: Date) => {
    if (disabled?.(day)) return
    onSelect?.(day)
  }

  return (
    <div className={cn('p-3 select-none', className)} {...props}>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setVisibleMonth(subMonths(visibleMonth, 1))}
          className="h-7 w-7 rounded hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium">{format(visibleMonth, 'MMMM yyyy')}</div>
        <button
          type="button"
          onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
          className="h-7 w-7 rounded hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="h-6 flex items-center justify-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const isOutside = !isSameMonth(day, visibleMonth)
          const isSelected = selected ? isSameDay(day, selected) : false
          const isToday = isSameDay(day, new Date())
          const isDisabled = disabled?.(day) ?? false
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handlePick(day)}
              disabled={isDisabled}
              className={cn(
                'h-9 w-9 rounded-md text-sm flex items-center justify-center',
                'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isOutside && 'text-muted-foreground/50',
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                !isSelected && isToday && 'border border-primary/50',
                isDisabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
              )}
              aria-pressed={isSelected}
              aria-label={format(day, 'PPPP')}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
