'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import MobileSurveyWizard from '@/components/surveys/mobile/mobile-survey-wizard'
import { PWAInstallPrompt } from '@/components/pwa/pwa-install-prompt'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { Loader2 } from 'lucide-react'

function MobileSurveyWizardWithParams() {
  const searchParams = useSearchParams()
  // Accept both snake_case and camelCase for resilience with older links.
  // The Edit button on the survey detail page used `survey_id=` while this
  // page was reading `surveyId=`, so clicking Edit silently treated the
  // session as a fresh survey — which then crashed when it rendered a
  // half-initialized wizard over a different contact's draft.
  const customerId =
    searchParams.get('customerId') || searchParams.get('customer_id') || undefined
  const surveyId =
    searchParams.get('surveyId') || searchParams.get('survey_id') || undefined
  // Organization is authoritative from auth, not from URL — photo uploads
  // target storage paths keyed on org id, and a URL-driven org id leaves
  // room for mismatches that break RLS.
  const { organization } = useMultiTenantAuth()

  return (
    <MobileSurveyWizard
      customerId={customerId}
      surveyId={surveyId}
      organizationId={organization?.id}
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
      <PWAInstallPrompt />
    </div>
  )
}
