'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { SurveySection } from '@/lib/stores/survey-types'
import { WizardNavigation, WizardNavigationLabel } from './wizard-navigation'
import { WizardFooter } from './wizard-footer'
import { Save, X } from 'lucide-react'
import { FormErrorBoundary, ErrorBoundary } from '@/components/error-boundaries'
import { useToast } from '@/components/ui/use-toast'

// Section components will be imported here
import { PropertySection } from './sections/property-section'
import { AccessSection } from './sections/access-section'
import { EnvironmentSection } from './sections/environment-section'
import { HazardsSection } from './sections/hazards-section'
import { PhotosSection } from './sections/photos-section'
import { ReviewSection } from './sections/review-section'

/**
 * Error boundary wrapper for the Survey Wizard
 */
export function SurveyWizardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <FormErrorBoundary
      formName="Site Survey"
      backPath="/site-surveys"
      backLabel="Back to Surveys"
    >
      {children}
    </FormErrorBoundary>
  );
}

/**
 * Error boundary for individual wizard sections
 * Allows other sections to continue working if one section fails
 */
function SectionErrorBoundary({
  children,
  sectionName,
}: {
  children: ReactNode;
  sectionName: string;
}) {
  return (
    <ErrorBoundary
      name={`SurveySection:${sectionName}`}
      minHeight="200px"
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  );
}

interface SurveyWizardProps {
  surveyId?: string
  customerId?: string
  className?: string
}

const sectionComponents: Record<SurveySection, React.ComponentType> = {
  property: PropertySection,
  access: AccessSection,
  environment: EnvironmentSection,
  hazards: HazardsSection,
  photos: PhotosSection,
  review: ReviewSection,
}

export function SurveyWizard({ surveyId, customerId, className }: SurveyWizardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    currentSection,
    isDirty,
    lastSavedAt,
    markSaved,
    setCurrentSurveyId,
    setCustomerId,
    submitSurvey,
    resetSurvey,
    syncError,
  } = useSurveyStore()

  // Initialize survey IDs
  useEffect(() => {
    if (surveyId) {
      setCurrentSurveyId(surveyId)
    }
    if (customerId) {
      setCustomerId(customerId)
    }
  }, [surveyId, customerId, setCurrentSurveyId, setCustomerId])

  // Auto-save effect (mark as saved when changes are persisted to localStorage)
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        markSaved()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isDirty, markSaved])

  const handleSaveAndExit = () => {
    markSaved()
    router.push('/site-surveys')
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const success = await submitSurvey()

      if (success) {
        // Clear local storage after successful submission
        resetSurvey()

        toast({
          title: 'Survey Submitted',
          description: 'Your site survey has been successfully submitted.',
        })

        router.push('/site-surveys')
      } else {
        toast({
          variant: 'destructive',
          title: 'Submission Failed',
          description: syncError || 'Failed to submit survey. Please try again.',
        })
      }
    } catch (error) {
      console.error('Survey submission error:', error)
      toast({
        variant: 'destructive',
        title: 'Submission Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const CurrentSectionComponent = sectionComponents[currentSection]

  return (
    <div className={cn('flex flex-col min-h-screen bg-background', className)}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveAndExit}
            className="touch-manipulation min-h-[44px]"
          >
            <X className="w-5 h-5 mr-1" />
            Exit
          </Button>

          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-xs text-muted-foreground">Unsaved</span>
            )}
            {!isDirty && lastSavedAt && (
              <span className="text-xs text-green-600">Saved</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => markSaved()}
              className="touch-manipulation min-h-[44px]"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        {/* Progress Navigation */}
        <WizardNavigation />
        <WizardNavigationLabel className="pb-3" />
      </header>

      {/* Main Content Area - wrapped with error boundary for section rendering */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-6">
          <SectionErrorBoundary sectionName={currentSection}>
            <CurrentSectionComponent />
          </SectionErrorBoundary>
        </div>
      </main>

      {/* Footer Navigation */}
      <WizardFooter onSubmit={handleSubmit} onSaveDraft={() => markSaved()} isSubmitting={isSubmitting} />
    </div>
  )
}
