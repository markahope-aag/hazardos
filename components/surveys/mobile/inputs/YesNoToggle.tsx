'use client'

import { cn } from '@/lib/utils'

interface YesNoToggleProps {
  value: boolean | null
  onChange: (value: boolean) => void
  yesLabel?: string
  noLabel?: string
  className?: string
  disabled?: boolean
}

export function YesNoToggle({
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
  className,
  disabled = false,
}: YesNoToggleProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      <button
        type="button"
        onClick={() => !disabled && onChange(true)}
        disabled={disabled}
        className={cn(
          'flex-1 min-h-[56px] px-6 py-3 rounded-lg font-medium text-lg',
          'touch-manipulation transition-all duration-200',
          'border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
          value === true
            ? 'bg-green-600 border-green-700 text-white'
            : 'bg-background border-border text-foreground hover:border-green-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-pressed={value === true}
        aria-disabled={disabled}
      >
        {yesLabel}
      </button>

      <button
        type="button"
        onClick={() => !disabled && onChange(false)}
        disabled={disabled}
        className={cn(
          'flex-1 min-h-[56px] px-6 py-3 rounded-lg font-medium text-lg',
          'touch-manipulation transition-all duration-200',
          'border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
          value === false
            ? 'bg-red-600 border-red-700 text-white'
            : 'bg-background border-border text-foreground hover:border-red-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-pressed={value === false}
        aria-disabled={disabled}
      >
        {noLabel}
      </button>
    </div>
  )
}

interface YesNoNaToggleProps {
  value: boolean | null
  onChange: (value: boolean | null) => void
  yesLabel?: string
  noLabel?: string
  naLabel?: string
  className?: string
  disabled?: boolean
}

export function YesNoNaToggle({
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
  naLabel = 'N/A',
  className,
  disabled = false,
}: YesNoNaToggleProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      <button
        type="button"
        onClick={() => !disabled && onChange(true)}
        disabled={disabled}
        className={cn(
          'flex-1 min-h-[52px] px-4 py-2 rounded-lg font-medium',
          'touch-manipulation transition-all duration-200',
          'border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
          value === true
            ? 'bg-green-600 border-green-700 text-white'
            : 'bg-background border-border text-foreground hover:border-green-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-pressed={value === true}
        aria-disabled={disabled}
      >
        {yesLabel}
      </button>

      <button
        type="button"
        onClick={() => !disabled && onChange(false)}
        disabled={disabled}
        className={cn(
          'flex-1 min-h-[52px] px-4 py-2 rounded-lg font-medium',
          'touch-manipulation transition-all duration-200',
          'border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
          value === false
            ? 'bg-red-600 border-red-700 text-white'
            : 'bg-background border-border text-foreground hover:border-red-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-pressed={value === false}
        aria-disabled={disabled}
      >
        {noLabel}
      </button>

      <button
        type="button"
        onClick={() => !disabled && onChange(null)}
        disabled={disabled}
        className={cn(
          'flex-1 min-h-[52px] px-4 py-2 rounded-lg font-medium',
          'touch-manipulation transition-all duration-200',
          'border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500',
          value === null
            ? 'bg-gray-600 border-gray-700 text-white'
            : 'bg-background border-border text-foreground hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-pressed={value === null}
        aria-disabled={disabled}
      >
        {naLabel}
      </button>
    </div>
  )
}
