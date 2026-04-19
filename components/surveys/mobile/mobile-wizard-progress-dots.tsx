'use client'

import { cn } from '@/lib/utils'
import { SURVEY_SECTIONS, SECTION_LABELS, SurveySection } from '@/lib/stores/survey-types'
import { Check } from 'lucide-react'

interface Props {
  currentSection: SurveySection
  sectionValidation: Record<SurveySection, { isValid: boolean; errors: string[] }>
  onSectionClick: (section: SurveySection) => void
}

/**
 * Horizontal row of step dots shown in the mobile survey wizard header.
 * Current step gets a ring, completed steps turn green with a check, past
 * un-completed steps are grey, future steps are light grey. Tapping a
 * dot jumps to that section.
 */
export function MobileWizardProgressDots({
  currentSection,
  sectionValidation,
  onSectionClick,
}: Props) {
  const currentIndex = SURVEY_SECTIONS.indexOf(currentSection)

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4">
      {SURVEY_SECTIONS.map((section, index) => {
        const isCurrent = section === currentSection
        const isCompleted = sectionValidation[section]?.isValid
        const isPast = index < currentIndex

        return (
          <button
            key={section}
            onClick={() => onSectionClick(section)}
            className={cn(
              'relative flex items-center justify-center touch-manipulation transition-all duration-200',
              'min-w-[40px] min-h-[40px] rounded-full',
              isCurrent && 'ring-2 ring-primary ring-offset-2',
            )}
            aria-label={`Go to ${SECTION_LABELS[section]} section${isCompleted ? ' (completed)' : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span
              className={cn(
                'flex items-center justify-center w-3 h-3 rounded-full transition-all duration-200',
                isCurrent && 'w-4 h-4 bg-primary',
                isCompleted && !isCurrent && 'w-4 h-4 bg-green-500',
                !isCurrent && !isCompleted && isPast && 'bg-gray-400',
                !isCurrent && !isCompleted && !isPast && 'bg-gray-300',
              )}
            >
              {isCompleted && !isCurrent && (
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
