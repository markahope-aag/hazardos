'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAssessmentRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to new site-surveys page
    router.replace('/site-surveys/new')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Redirecting...</h1>
        <p className="text-gray-600">
          Assessments are now called Site Surveys. Redirecting you to create a new site survey.
        </p>
      </div>
    </div>
  )
}