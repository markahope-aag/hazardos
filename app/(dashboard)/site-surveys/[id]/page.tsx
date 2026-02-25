'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { logger, formatError } from '@/lib/utils/logger'
import { SurveyStatusBadge, HazardTypeBadge } from '@/components/surveys/survey-status-badge'
import { SurveyDetailTabs } from './survey-detail-tabs'
import { SurveyActions } from './survey-actions'
import type { SiteSurvey } from '@/types/database'

type SurveyWithRelations = SiteSurvey & {
  customer?: {
    id: string
    company_name: string | null
    name: string
    email: string | null
    phone: string | null
  } | null
  technician?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  } | null
}

export default function SurveyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()
  const [survey, setSurvey] = useState<SurveyWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingEstimate, setGeneratingEstimate] = useState(false)

  const surveyId = params.id as string

  const loadSurvey = useCallback(async () => {
    if (!surveyId || !organization?.id) return

    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('site_surveys')
        .select(`
          *,
          customer:customers(id, company_name, name, email, phone),
          technician:profiles!assigned_to(id, first_name, last_name, email)
        `)
        .eq('id', surveyId)
        .eq('organization_id', organization.id)
        .single()

      if (error) throw error

      if (!data) {
        toast({
          title: 'Survey not found',
          description: 'The requested survey could not be found.',
          variant: 'destructive',
        })
        router.push('/site-surveys')
        return
      }

      // Transform relations (Supabase may return arrays)
      const transformedData = {
        ...data,
        customer: Array.isArray(data.customer) ? data.customer[0] || null : data.customer,
        technician: Array.isArray(data.technician) ? data.technician[0] || null : data.technician,
      } as SurveyWithRelations

      setSurvey(transformedData)
    } catch (error) {
      logger.error(
        { 
          error: formatError(error, 'SURVEY_LOAD_ERROR'),
          surveyId,
          organizationId: organization?.id
        },
        'Error loading survey'
      )
      toast({
        title: 'Error',
        description: 'Failed to load survey.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [surveyId, organization?.id, toast, router])

  useEffect(() => {
    loadSurvey()
  }, [loadSurvey])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Survey not found</h1>
        <p className="text-muted-foreground mb-4">
          The requested survey could not be found.
        </p>
        <Link href="/site-surveys">
          <Button>Back to Surveys</Button>
        </Link>
      </div>
    )
  }

  const customerName = survey.customer
    ? survey.customer.company_name || survey.customer.name
    : survey.customer_name

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/site-surveys"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Surveys
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{customerName}</h1>
            <SurveyStatusBadge status={survey.status} />
            <HazardTypeBadge hazardType={survey.hazard_type} />
          </div>
          <p className="text-muted-foreground">
            {survey.site_address}, {survey.site_city}, {survey.site_state} {survey.site_zip}
          </p>
          {survey.technician && (
            <p className="text-sm text-muted-foreground">
              Assigned to {survey.technician.first_name} {survey.technician.last_name}
              {survey.scheduled_date && (
                <> • Scheduled for {new Date(survey.scheduled_date).toLocaleDateString()}</>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SurveyActions survey={survey} onStatusChange={loadSurvey} />

          {survey.status === 'reviewed' && (
            <Button
              onClick={async () => {
                try {
                  setGeneratingEstimate(true)
                  const res = await fetch('/api/estimates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ site_survey_id: survey.id }),
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
                  setGeneratingEstimate(false)
                }
              }}
              disabled={generatingEstimate}
            >
              {generatingEstimate ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4 mr-2" />
              )}
              {generatingEstimate ? 'Generating...' : 'Generate Estimate'}
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <SurveyDetailTabs survey={survey} />
    </div>
  )
}
