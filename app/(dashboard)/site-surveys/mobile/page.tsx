'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import MobileSurveyWizard from '@/components/surveys/mobile/mobile-survey-wizard'
import { Loader2 } from 'lucide-react'

function MobileSurveyWizardWithParams() {
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customerId') || undefined
  const surveyId = searchParams.get('surveyId') || undefined
  const organizationId = searchParams.get('organizationId') || undefined

  return (
    <MobileSurveyWizard
      customerId={customerId}
      surveyId={surveyId}
      organizationId={organizationId}
    />
  )
}

export default function MobileSurveyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <MobileSurveyWizardWithParams />
      </Suspense>
    </div>
  )
}
