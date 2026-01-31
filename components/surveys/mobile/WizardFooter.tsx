'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { SURVEY_SECTIONS } from '@/lib/stores/survey-types'
import { ChevronLeft, ChevronRight, Check, Send } from 'lucide-react'

interface WizardFooterProps {
  className?: string
  onSubmit?: () => void
  onSaveDraft?: () => void
}

export function WizardFooter({ className, onSubmit, onSaveDraft: _onSaveDraft }: WizardFooterProps) {
  const { currentSection, setCurrentSection, validateSection, validateAll } = useSurveyStore()

  const currentIndex = SURVEY_SECTIONS.indexOf(currentSection)
  const isFirstSection = currentIndex === 0
  const isLastSection = currentIndex === SURVEY_SECTIONS.length - 1
  const isReviewSection = currentSection === 'review'

  const handleBack = () => {
    if (!isFirstSection) {
      setCurrentSection(SURVEY_SECTIONS[currentIndex - 1])
    }
  }

  const handleNext = () => {
    // Validate current section before moving forward
    const _validation = validateSection(currentSection)

    if (!isLastSection) {
      setCurrentSection(SURVEY_SECTIONS[currentIndex + 1])
    }
  }

  const handleSubmit = () => {
    if (validateAll()) {
      onSubmit?.()
    }
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-background border-t border-border',
        'safe-area-bottom',
        className
      )}
    >
      <div className="flex items-center justify-between p-4 gap-3">
        {/* Back Button */}
        <Button
          variant="outline"
          size="lg"
          onClick={handleBack}
          disabled={isFirstSection}
          className={cn(
            'flex-1 min-h-[52px] touch-manipulation',
            isFirstSection && 'invisible'
          )}
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </Button>

        {/* Next/Submit Button */}
        {isReviewSection ? (
          <Button
            size="lg"
            onClick={handleSubmit}
            className="flex-1 min-h-[52px] touch-manipulation bg-green-600 hover:bg-green-700"
          >
            <Send className="w-5 h-5 mr-2" />
            Submit
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleNext}
            className="flex-1 min-h-[52px] touch-manipulation"
          >
            {isLastSection ? (
              <>
                Review
                <Check className="w-5 h-5 ml-1" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
