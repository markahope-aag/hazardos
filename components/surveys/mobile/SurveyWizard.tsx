'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { SurveySection } from '@/lib/stores/survey-types'
import { WizardNavigation, WizardNavigationLabel } from './WizardNavigation'
import { WizardFooter } from './WizardFooter'
import { Save, X } from 'lucide-react'

// Section components will be imported here
import { PropertySection } from './sections/PropertySection'
import { AccessSection } from './sections/AccessSection'
import { EnvironmentSection } from './sections/EnvironmentSection'
import { HazardsSection } from './sections/HazardsSection'
import { PhotosSection } from './sections/PhotosSection'
import { ReviewSection } from './sections/ReviewSection'

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
  const {
    currentSection,
    isDirty,
    lastSavedAt,
    markSaved,
    setCurrentSurveyId,
    setCustomerId,
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

  const handleSubmit = () => {
    // TODO: Submit to API
    console.log('Submitting survey...')
    router.push('/site-surveys')
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-6">
          <CurrentSectionComponent />
        </div>
      </main>

      {/* Footer Navigation */}
      <WizardFooter onSubmit={handleSubmit} onSaveDraft={() => markSaved()} />
    </div>
  )
}
