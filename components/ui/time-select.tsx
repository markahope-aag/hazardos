'use client'

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
  return (
    <Select
      value={normalized || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {TIME_OPTIONS.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            ref={
              opt.value === defaultScrollAnchor && !normalized
                ? (el) => {
                    // Radix portals content on open, so this ref callback
                    // fires each time the dropdown opens with no selection.
                    // rAF so layout is settled before scrollIntoView measures.
                    if (el) {
                      requestAnimationFrame(() => {
                        el.scrollIntoView({ block: 'start' })
                      })
                    }
                  }
                : undefined
            }
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
