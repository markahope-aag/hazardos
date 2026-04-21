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

interface TimeSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

export function TimeSelect({
  id,
  value,
  onChange,
  placeholder = 'Select time',
  className,
  disabled,
  'aria-label': ariaLabel,
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
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
