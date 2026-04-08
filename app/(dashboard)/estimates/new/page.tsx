'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

interface SurveySummary {
  id: string
  job_name: string | null
  customer_name: string | null
  site_address: string | null
  site_city: string | null
  site_state: string | null
  hazard_type: string | null
  status: string
}

export default function NewEstimatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const surveyId = searchParams.get('survey_id')

  const [survey, setSurvey] = useState<SurveySummary | null>(null)
  const [loading, setLoading] = useState(!!surveyId)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!surveyId) return

    const supabase = createClient()
    supabase
      .from('site_surveys')
      .select('id, job_name, customer_name, site_address, site_city, site_state, hazard_type, status')
      .eq('id', surveyId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({
            title: 'Survey not found',
            description: 'Could not load the linked survey.',
            variant: 'destructive',
          })
        } else {
          setSurvey(data)
        }
        setLoading(false)
      })
  }, [surveyId, toast])

  const handleGenerate = async () => {
    if (!surveyId) return

    try {
      setGenerating(true)
      const res = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_survey_id: surveyId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate estimate')
      }
      const { estimate } = await res.json()
      toast({
        title: 'Estimate generated',
        description: `Estimate ${estimate.estimate_number} has been created.`,
      })
      router.push(`/estimates/${estimate.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate estimate.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={surveyId ? `/site-surveys/${surveyId}` : '/estimates'}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Estimate</h1>
          <p className="text-muted-foreground">Generate a cost estimate from a site survey</p>
        </div>
      </div>

      {survey ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Survey Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Customer</p>
                <p className="font-medium">{survey.customer_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Hazard Type</p>
                <p className="font-medium capitalize">{survey.hazard_type || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">
                  {[survey.site_address, survey.site_city, survey.site_state].filter(Boolean).join(', ') || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Survey Status</p>
                <p className="font-medium capitalize">{survey.status}</p>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4 mr-2" />
              )}
              {generating ? 'Generating Estimate...' : 'Generate Estimate'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No survey selected</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Estimates are generated from completed site surveys. Select a survey to get started.
            </p>
            <Button asChild>
              <Link href="/site-surveys">Browse Surveys</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
