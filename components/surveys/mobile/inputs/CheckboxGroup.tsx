'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface CheckboxOption<T extends string> {
  value: T
  label: string
  description?: string
}

interface CheckboxGroupProps<T extends string> {
  values: T[]
  onChange: (values: T[]) => void
  options: CheckboxOption<T>[]
  className?: string
  disabled?: boolean
  columns?: 1 | 2
}

export function CheckboxGroup<T extends string>({
  values,
  onChange,
  options,
  className,
  disabled = false,
  columns = 1,
}: CheckboxGroupProps<T>) {
  const handleToggle = (value: T) => {
    if (disabled) return

    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value))
    } else {
      onChange([...values, value])
    }
  }

  return (
    <div
      className={cn(
        'grid gap-2',
        columns === 2 ? 'grid-cols-2' : 'grid-cols-1',
        className
      )}
      role="group"
    >
      {options.map((option) => {
        const isChecked = values.includes(option.value)

        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={isChecked}
            onClick={() => handleToggle(option.value)}
            disabled={disabled}
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg text-left',
              'touch-manipulation transition-all duration-200',
              'border-2 min-h-[56px]',
              isChecked
                ? 'bg-primary/10 border-primary'
                : 'bg-background border-border hover:border-primary/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-md border-2 mt-0.5 flex-shrink-0',
                'transition-all duration-200',
                isChecked
                  ? 'bg-primary border-primary'
                  : 'bg-background border-muted-foreground/30'
              )}
            >
              {isChecked && <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-foreground">{option.label}</span>
              {option.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Single checkbox for standalone use
interface SingleCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  className?: string
  disabled?: boolean
}

export function SingleCheckbox({
  checked,
  onChange,
  label,
  description,
  className,
  disabled = false,
}: SingleCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg text-left w-full',
        'touch-manipulation transition-all duration-200',
        'border-2 min-h-[56px]',
        checked
          ? 'bg-primary/10 border-primary'
          : 'bg-background border-border hover:border-primary/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-6 h-6 rounded-md border-2 mt-0.5 flex-shrink-0',
          'transition-all duration-200',
          checked
            ? 'bg-primary border-primary'
            : 'bg-background border-muted-foreground/30'
        )}
      >
        {checked && <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground">{label}</span>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </button>
  )
}
