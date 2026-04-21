'use client'

import { useRef } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hour = Math.floor(i / 4)
  const minute = (i % 4) * 15
  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  const value = `${hh}:${mm}`
  const period = hour < 12 ? 'AM' : 'PM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const label = `${displayHour}:${mm} ${period}`
  return { value, label }
})

// When the dropdown is opened without an existing selection, Radix defaults
// to the top of the list (12:00 AM). For a field-crew app that mostly
// schedules daytime work, opening at the start of the working day means
// less scrolling — field teams typically start around 7 AM.
const DEFAULT_SCROLL_ANCHOR = '07:00'

interface TimeSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
  /**
   * Which option to scroll into view when the dropdown opens with no
   * existing selection. Defaults to 07:00 (start of working day). Pass
   * a different HH:MM to anchor an end-time field later in the day, etc.
   */
  defaultScrollAnchor?: string
}

export function TimeSelect({
  id,
  value,
  onChange,
  placeholder = 'Select time',
  className,
  disabled,
  'aria-label': ariaLabel,
  defaultScrollAnchor = DEFAULT_SCROLL_ANCHOR,
}: TimeSelectProps) {
  const normalized = value ? value.slice(0, 5) : ''
  const anchorRef = useRef<HTMLDivElement | null>(null)

  // Radix auto-scrolls to the highlighted (selected) item after it opens
  // the popover, which clobbers anything we do inside a ref callback on
  // mount. Wait until that settles, then scroll our anchor into view.
  // ~80ms is reliable across Chrome/Safari/Firefox; shorter delays lose
  // the race on slower devices.
  const handleOpenChange = (open: boolean) => {
    if (!open || normalized) return
    const el = anchorRef.current
    if (!el) return
    setTimeout(() => {
      el.scrollIntoView({ block: 'start' })
    }, 80)
  }

  return (
    <Select
      value={normalized || undefined}
      onValueChange={onChange}
      disabled={disabled}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {TIME_OPTIONS.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            ref={opt.value === defaultScrollAnchor ? anchorRef : undefined}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
