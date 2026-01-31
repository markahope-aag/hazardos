'use client'

import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { HazardType } from '@/lib/stores/survey-types'
import { Check } from 'lucide-react'

interface HazardTypeOption {
  value: HazardType
  label: string
  emoji: string
  description: string
  color: string
  bgColor: string
  borderColor: string
}

const HAZARD_OPTIONS: HazardTypeOption[] = [
  {
    value: 'asbestos',
    label: 'ASBESTOS',
    emoji: '⚠️',
    description: 'Pipe insulation, ceiling tiles, floor tiles, vermiculite, siding, roofing',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-500',
  },
  {
    value: 'mold',
    label: 'MOLD',
    emoji: '🦠',
    description: 'Visible growth, water damage, musty odors',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
  },
  {
    value: 'lead',
    label: 'LEAD PAINT',
    emoji: '🎨',
    description: 'Pre-1978 buildings, deteriorating paint',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
  },
  {
    value: 'other',
    label: 'OTHER',
    emoji: '⚡',
    description: 'PCBs, mercury, silica, other regulated materials',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500',
  },
]

interface HazardTypeSelectorProps {
  className?: string
}

export function HazardTypeSelector({ className }: HazardTypeSelectorProps) {
  const { formData, toggleHazardType } = useSurveyStore()
  const selectedTypes = formData.hazards.types

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm text-muted-foreground">
        Select all hazard types identified at this property
      </p>

      <div className="grid grid-cols-1 gap-3">
        {HAZARD_OPTIONS.map((option) => {
          const isSelected = selectedTypes.includes(option.value)

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleHazardType(option.value)}
              className={cn(
                'relative flex items-start gap-4 p-4 rounded-xl text-left',
                'touch-manipulation transition-all duration-200',
                'border-2 min-h-[88px]',
                isSelected
                  ? `${option.bgColor} ${option.borderColor}`
                  : 'bg-background border-border hover:border-muted-foreground/50'
              )}
            >
              {/* Checkbox indicator */}
              <div
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-lg border-2 flex-shrink-0 mt-0.5',
                  'transition-all duration-200',
                  isSelected
                    ? `${option.borderColor} bg-white`
                    : 'border-muted-foreground/30 bg-background'
                )}
              >
                {isSelected && (
                  <Check className={cn('w-5 h-5', option.color)} strokeWidth={3} />
                )}
              </div>

              {/* Emoji */}
              <span className="text-3xl flex-shrink-0">{option.emoji}</span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    'font-bold text-lg block',
                    isSelected ? option.color : 'text-foreground'
                  )}
                >
                  {option.label}
                </span>
                <span className="text-sm text-muted-foreground line-clamp-2">
                  {option.description}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {selectedTypes.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Tap a hazard type to begin documenting
        </p>
      )}
    </div>
  )
}
