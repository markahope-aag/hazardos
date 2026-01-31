'use client'

import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { SURVEY_SECTIONS, SECTION_LABELS, SurveySection } from '@/lib/stores/survey-types'
import { Check } from 'lucide-react'

interface WizardNavigationProps {
  className?: string
}

export function WizardNavigation({ className }: WizardNavigationProps) {
  const { currentSection, setCurrentSection, sectionValidation } = useSurveyStore()

  const currentIndex = SURVEY_SECTIONS.indexOf(currentSection)

  return (
    <div className={cn('flex items-center justify-center gap-2 py-3 px-4', className)}>
      {SURVEY_SECTIONS.map((section, index) => {
        const isCurrent = section === currentSection
        const isCompleted = sectionValidation[section]?.isValid
        const isPast = index < currentIndex

        return (
          <button
            key={section}
            onClick={() => setCurrentSection(section)}
            className={cn(
              'relative flex items-center justify-center touch-manipulation transition-all duration-200',
              'min-w-[40px] min-h-[40px] rounded-full',
              isCurrent && 'ring-2 ring-primary ring-offset-2',
            )}
            aria-label={`Go to ${SECTION_LABELS[section]} section`}
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

interface WizardNavigationLabelProps {
  className?: string
}

export function WizardNavigationLabel({ className }: WizardNavigationLabelProps) {
  const { currentSection } = useSurveyStore()
  const currentIndex = SURVEY_SECTIONS.indexOf(currentSection)

  return (
    <div className={cn('text-center', className)}>
      <p className="text-sm text-muted-foreground">
        Step {currentIndex + 1} of {SURVEY_SECTIONS.length}
      </p>
      <h2 className="text-lg font-semibold text-foreground">
        {SECTION_LABELS[currentSection]}
      </h2>
    </div>
  )
}
