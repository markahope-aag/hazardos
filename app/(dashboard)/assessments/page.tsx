'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AssessmentsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to site-surveys with a brief delay to show the redirect is happening
    router.replace('/site-surveys')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Redirecting...</h1>
        <p className="text-gray-600">
          Assessments are now called Site Surveys. Redirecting you to the new location.
        </p>
      </div>
    </div>
  )
}