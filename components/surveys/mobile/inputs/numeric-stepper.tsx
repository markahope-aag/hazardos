'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Minus, Plus } from 'lucide-react'

interface NumericStepperProps {
  value: number | null
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Stepper with a directly-editable number input in the middle. The +/−
// buttons stay as accelerators, but typing a value (e.g. "72" for 72°F)
// is the primary mode — tapping to an exact value through repeated +/−
// presses is painful on mobile, especially for ranges like -20..150.
export function NumericStepper({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  suffix,
  placeholder = '—',
  className,
  disabled = false,
}: NumericStepperProps) {
  // Local draft so a partial entry ("-", "1", "12") doesn't fight with
  // the clamp-on-commit behavior.
  const [draft, setDraft] = useState<string>(value !== null ? String(value) : '')

  useEffect(() => {
    setDraft(value !== null ? String(value) : '')
  }, [value])

  const commit = (raw: string) => {
    const trimmed = raw.trim()
    if (trimmed === '' || trimmed === '-') {
      // Treat empty as the min — keeps downstream consumers expecting a
      // number happy (onChange is typed as (number) => void).
      onChange(min)
      setDraft(String(min))
      return
    }
    const parsed = Number(trimmed)
    if (Number.isNaN(parsed)) {
      setDraft(value !== null ? String(value) : '')
      return
    }
    const clamped = Math.min(max, Math.max(min, parsed))
    onChange(clamped)
    setDraft(String(clamped))
  }

  const handleDecrement = () => {
    if (disabled) return
    const currentValue = value ?? min
    onChange(Math.max(min, currentValue - step))
  }

  const handleIncrement = () => {
    if (disabled) return
    const currentValue = value ?? min
    onChange(Math.min(max, currentValue + step))
  }

  const canDecrement = !disabled && value !== null && value > min
  const canIncrement = !disabled && (value === null || value < max)

  return (
    <div
      className={cn(
        'flex items-center justify-between bg-muted rounded-lg p-1',
        disabled && 'opacity-50',
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDecrement}
        disabled={!canDecrement}
        className="min-w-[52px] min-h-[52px] touch-manipulation rounded-lg"
        aria-label="Decrease value"
      >
        <Minus className="w-6 h-6" />
      </Button>

      <div className="flex-1 flex items-center justify-center px-2">
        <input
          type="number"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          className={cn(
            'w-full bg-transparent text-center text-2xl font-semibold tabular-nums',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 rounded',
            'appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          )}
          aria-label="Value"
        />
        {suffix && draft !== '' && (
          <span className="text-sm text-muted-foreground ml-1 whitespace-nowrap">{suffix}</span>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleIncrement}
        disabled={!canIncrement}
        className="min-w-[52px] min-h-[52px] touch-manipulation rounded-lg"
        aria-label="Increase value"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  )
}
