'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { SurveySection, SECTION_LABELS } from '@/lib/stores/survey-types'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

// interface SectionStatus {
//   section: SurveySection
//   label: string
//   isComplete: boolean
//   errors: string[]
// }

export function CompletionChecklist() {
  const { validateSection, setCurrentSection } = useSurveyStore()

  const sectionStatuses = useMemo(() => {
    const sectionsToCheck: SurveySection[] = ['property', 'access', 'environment', 'hazards', 'photos']

    return sectionsToCheck.map((section) => {
      const validation = validateSection(section)
      return {
        section,
        label: SECTION_LABELS[section],
        isComplete: validation.isValid,
        errors: validation.errors,
      }
    })
  }, [validateSection])

  const completedCount = sectionStatuses.filter((s) => s.isComplete).length
  const totalCount = sectionStatuses.length
  const allComplete = completedCount === totalCount

  const handleSectionClick = (section: SurveySection) => {
    setCurrentSection(section)
  }

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <div
        className={cn(
          'p-4 rounded-xl border-2',
          allComplete
            ? 'bg-green-50 border-green-300'
            : 'bg-yellow-50 border-yellow-300'
        )}
      >
        <div className="flex items-center gap-3">
          {allComplete ? (
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          )}
          <div>
            <p className="font-semibold text-lg">
              {allComplete ? 'Ready to Submit' : 'Survey Incomplete'}
            </p>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} sections complete
            </p>
          </div>
        </div>
      </div>

      {/* Section List */}
      <div className="space-y-2">
        {sectionStatuses.map(({ section, label, isComplete, errors }) => (
          <button
            key={section}
            type="button"
            onClick={() => handleSectionClick(section)}
            className={cn(
              'w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors touch-manipulation',
              isComplete
                ? 'border-green-200 bg-green-50/50 hover:bg-green-50'
                : 'border-red-200 bg-red-50/50 hover:bg-red-50'
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium">{label}</p>
              {!isComplete && errors.length > 0 && (
                <ul className="text-sm text-red-600 mt-1 space-y-0.5">
                  {errors.map((error: string, i: number) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              )}
            </div>
            <span className="text-sm text-muted-foreground">Tap to edit</span>
          </button>
        ))}
      </div>
    </div>
  )
}
