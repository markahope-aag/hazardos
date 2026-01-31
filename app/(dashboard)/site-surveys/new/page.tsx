'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SimpleSiteSurveyForm } from '@/components/assessments/simple-site-survey-form'

export default function NewSiteSurveyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/site-surveys">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Site Survey</h1>
          <p className="text-gray-600">Create a new field site survey</p>
        </div>
      </div>

      {/* Form */}
      <SimpleSiteSurveyForm />
    </div>
  )
}