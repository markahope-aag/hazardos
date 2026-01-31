'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function AssessmentDetailRedirectPage() {
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    // Redirect to site-surveys detail page with the same ID
    const assessmentId = params.id as string
    if (assessmentId) {
      router.replace(`/site-surveys/${assessmentId}`)
    } else {
      router.replace('/site-surveys')
    }
  }, [router, params.id])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Redirecting...</h1>
        <p className="text-gray-600">
          Assessments are now called Site Surveys. Redirecting you to the site survey details.
        </p>
      </div>
    </div>
  )
}