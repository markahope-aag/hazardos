'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface RadioCardOption<T extends string> {
  value: T
  label: string
  description?: string
  icon?: LucideIcon
  iconEmoji?: string
}

interface RadioCardGroupProps<T extends string> {
  value: T | null
  onChange: (value: T) => void
  options: RadioCardOption<T>[]
  className?: string
  disabled?: boolean
  columns?: 1 | 2
  size?: 'sm' | 'md' | 'lg'
}

export function RadioCardGroup<T extends string>({
  value,
  onChange,
  options,
  className,
  disabled = false,
  columns = 1,
  size = 'md',
}: RadioCardGroupProps<T>) {
  const sizeClasses = {
    sm: 'min-h-[60px] p-3',
    md: 'min-h-[72px] p-4',
    lg: 'min-h-[88px] p-5',
  }

  return (
    <div
      className={cn(
        'grid gap-3',
        columns === 2 ? 'grid-cols-2' : 'grid-cols-1',
        className
      )}
      role="radiogroup"
    >
      {options.map((option) => {
        const isSelected = value === option.value
        const Icon = option.icon

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-3 rounded-xl text-left',
              'touch-manipulation transition-all duration-200',
              'border-2',
              sizeClasses[size],
              isSelected
                ? 'bg-primary/10 border-primary shadow-sm'
                : 'bg-background border-border hover:border-primary/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {/* Radio indicator */}
            <div
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full border-2 flex-shrink-0',
                'transition-all duration-200',
                isSelected
                  ? 'border-primary'
                  : 'border-muted-foreground/30'
              )}
            >
              {isSelected && (
                <div className="w-3 h-3 rounded-full bg-primary" />
              )}
            </div>

            {/* Icon */}
            {(Icon || option.iconEmoji) && (
              <div className="flex-shrink-0">
                {option.iconEmoji ? (
                  <span className="text-2xl">{option.iconEmoji}</span>
                ) : Icon ? (
                  <Icon className={cn(
                    'w-6 h-6',
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  )} />
                ) : null}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span className={cn(
                'font-medium block',
                isSelected ? 'text-foreground' : 'text-foreground'
              )}>
                {option.label}
              </span>
              {option.description && (
                <span className="text-sm text-muted-foreground line-clamp-2">
                  {option.description}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
