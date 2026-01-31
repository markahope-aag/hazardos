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
          'border-2',
          value === true
            ? 'bg-green-100 border-green-500 text-green-700'
            : 'bg-background border-border text-muted-foreground hover:border-green-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-pressed={value === true}
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
          'border-2',
          value === false
            ? 'bg-red-100 border-red-500 text-red-700'
            : 'bg-background border-border text-muted-foreground hover:border-red-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-pressed={value === false}
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
          'border-2',
          value === true
            ? 'bg-green-100 border-green-500 text-green-700'
            : 'bg-background border-border text-muted-foreground hover:border-green-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-pressed={value === true}
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
          'border-2',
          value === false
            ? 'bg-red-100 border-red-500 text-red-700'
            : 'bg-background border-border text-muted-foreground hover:border-red-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-pressed={value === false}
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
          'border-2',
          value === null
            ? 'bg-gray-100 border-gray-500 text-gray-700'
            : 'bg-background border-border text-muted-foreground hover:border-gray-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-pressed={value === null}
      >
        {naLabel}
      </button>
    </div>
  )
}
