'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SurveyWizard } from '@/components/surveys/mobile/SurveyWizard'
import { Loader2 } from 'lucide-react'

function SurveyWizardWithParams() {
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customerId') || undefined

  return <SurveyWizard customerId={customerId} />
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
        <SurveyWizardWithParams />
      </Suspense>
    </div>
  )
}
