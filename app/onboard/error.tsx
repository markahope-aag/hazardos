'use client'

import ErrorBoundary from '@/components/error-boundary'

// Onboarding is the first thing a new customer does. A failure here used to
// leave them with a login, no organisation and no explanation — see
// 20260805000002_allow_onboarding_first_org_claim.sql.
export default function OnboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundary error={error} reset={reset} />
}
