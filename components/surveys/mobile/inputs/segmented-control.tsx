'use client'

import { cn } from '@/lib/utils'

interface SegmentOption<T extends string | number> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string | number> {
  value: T | null
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  className?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  className,
  disabled = false,
  size = 'md',
}: SegmentedControlProps<T>) {
  const sizeClasses = {
    sm: 'min-h-[44px] text-sm',
    md: 'min-h-[52px] text-base',
    lg: 'min-h-[60px] text-lg',
  }

  return (
    <div
      className={cn(
        'flex bg-muted rounded-lg p-1',
        disabled && 'opacity-50',
        className
      )}
      role="radiogroup"
    >
      {options.map((option) => {
        const isSelected = value === option.value

        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={cn(
              'flex-1 px-4 py-2 rounded-md font-medium',
              'touch-manipulation transition-all duration-200',
              sizeClasses[size],
              isSelected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
              disabled && 'cursor-not-allowed'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
