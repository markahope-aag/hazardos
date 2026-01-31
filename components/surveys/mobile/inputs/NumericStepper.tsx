'use client'

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
  const displayValue = value !== null ? value : null

  const handleDecrement = () => {
    if (disabled) return
    const currentValue = value ?? min
    const newValue = Math.max(min, currentValue - step)
    onChange(newValue)
  }

  const handleIncrement = () => {
    if (disabled) return
    const currentValue = value ?? min
    const newValue = Math.min(max, currentValue + step)
    onChange(newValue)
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

      <div className="flex-1 text-center px-2">
        <span className="text-2xl font-semibold tabular-nums">
          {displayValue !== null ? displayValue : placeholder}
        </span>
        {suffix && displayValue !== null && (
          <span className="text-sm text-muted-foreground ml-1">{suffix}</span>
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
