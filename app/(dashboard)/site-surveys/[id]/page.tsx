'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Calculator, ArrowRight, FileText, Building2, Phone, Thermometer, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { logger, formatError } from '@/lib/utils/logger'
import { SurveyStatusBadge, HazardTypeBadge } from '@/components/surveys/survey-status-badge'
import { SurveyDetailTabs } from './survey-detail-tabs'
import { SurveyActions } from './survey-actions'
import type { SiteSurvey } from '@/types/database'

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}

function formatLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

type SurveyWithRelations = SiteSurvey & {
  customer?: {
    id: string
    company_name: string | null
    name: string
    first_name: string | null
    last_name: string | null
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
  const [linkedEstimateId, setLinkedEstimateId] = useState<string | null>(null)

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
          customer:customers!customer_id(id, company_name, name, first_name, last_name, email, phone),
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

  useEffect(() => {
    if (!survey?.id) return
    const supabase = createClient()
    supabase
      .from('estimates')
      .select('id')
      .eq('site_survey_id', survey.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setLinkedEstimateId(data?.[0]?.id || null)
      })
  }, [survey?.id])

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

  const companyName = survey.customer?.company_name || null
  const contactName = survey.customer
    ? `${survey.customer.first_name || ''} ${survey.customer.last_name || ''}`.trim() || survey.customer.name
    : survey.customer_name
  const displayName = companyName || contactName

  const envInfo = survey.environment_info as import('@/types/database').SurveyEnvironmentInfo | null

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
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <SurveyStatusBadge status={survey.status} />
            <HazardTypeBadge hazardType={survey.hazard_type} />
          </div>
          {companyName && contactName && companyName !== contactName && (
            <p className="text-sm text-muted-foreground">
              Contact: {contactName}
              {survey.customer?.email && <> &middot; {survey.customer.email}</>}
              {survey.customer?.phone && <> &middot; {survey.customer.phone}</>}
            </p>
          )}
          <p className="text-muted-foreground">
            {survey.site_address}, {survey.site_city}, {survey.site_state} {survey.site_zip}
          </p>
          {(survey.owner_name || survey.owner_phone) && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              On-site contact: {survey.owner_name || '—'}
              {survey.owner_phone && <> &middot; {survey.owner_phone}</>}
            </p>
          )}
          {survey.technician && (
            <p className="text-sm text-muted-foreground">
              Assigned to {survey.technician.first_name} {survey.technician.last_name}
              {survey.scheduled_date && (
                <> &middot; Scheduled for {new Date(survey.scheduled_date).toLocaleDateString()}</>
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

      {/* Next Step Banner */}
      {linkedEstimateId ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm">
          <FileText className="h-4 w-4 text-green-600 shrink-0" />
          <span className="text-green-800">An estimate has been created from this survey.</span>
          <Link
            href={`/estimates/${linkedEstimateId}`}
            className="ml-auto inline-flex items-center gap-1 font-medium text-green-700 hover:underline"
          >
            View Estimate
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : survey.status === 'cancelled' ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm space-y-1">
          <div className="flex items-center gap-2 font-medium text-orange-900">
            Survey cancelled
            {survey.cancelled_at && (
              <span className="text-xs font-normal text-orange-700">
                · {new Date(survey.cancelled_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {survey.cancellation_reason && (
            <div className="text-orange-800 whitespace-pre-wrap">
              {survey.cancellation_reason}
            </div>
          )}
        </div>
      ) : survey.status === 'completed' || survey.status === 'reviewed' ? (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
          <Calculator className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-blue-800">Ready to estimate? Create an estimate from this survey.</span>
          <Link
            href={`/estimates/new?survey_id=${survey.id}`}
            className="ml-auto inline-flex items-center gap-1 font-medium text-blue-700 hover:underline"
          >
            Create Estimate
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      {/* Property Details, Environment & Lab Results */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Property Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Square Footage" value={
              survey.building_sqft ?? survey.area_sqft
                ? `${(survey.building_sqft ?? survey.area_sqft)?.toLocaleString()} sq ft`
                : null
            } />
            <DetailRow label="Stories" value={survey.stories?.toString()} />
            <DetailRow label="Year Built" value={survey.year_built?.toString()} />
            <DetailRow label="Building Type" value={formatLabel(survey.building_type)} />
            <DetailRow label="Construction Type" value={formatLabel(survey.construction_type)} />
            <DetailRow label="Occupancy Status" value={formatLabel(survey.occupancy_status)} />
          </CardContent>
        </Card>

        {/* Environment / Conditions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Environment &amp; Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {envInfo ? (
              <>
                <DetailRow
                  label="Temperature"
                  value={envInfo.temperature != null ? `${envInfo.temperature}°F` : null}
                />
                <DetailRow
                  label="Humidity"
                  value={envInfo.humidity != null ? `${envInfo.humidity}%` : null}
                />
                {envInfo.moistureIssues?.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Moisture Issues</span>
                    <span className="text-right max-w-[60%]">
                      {envInfo.moistureIssues.join(', ')}
                    </span>
                  </div>
                )}
                {envInfo.moistureNotes && (
                  <DetailRow label="Moisture Notes" value={envInfo.moistureNotes} />
                )}
                <DetailRow
                  label="Structural Concerns"
                  value={
                    envInfo.hasStructuralConcerns === true
                      ? envInfo.structuralConcerns?.length
                        ? envInfo.structuralConcerns.join(', ')
                        : 'Yes'
                      : envInfo.hasStructuralConcerns === false
                        ? 'None'
                        : null
                  }
                />
                {envInfo.structuralNotes && (
                  <DetailRow label="Structural Notes" value={envInfo.structuralNotes} />
                )}
                <DetailRow
                  label="Utility Shutoffs"
                  value={
                    envInfo.utilityShutoffsLocated === true
                      ? 'Located'
                      : envInfo.utilityShutoffsLocated === false
                        ? 'Not located'
                        : null
                  }
                />
              </>
            ) : (
              <p className="text-muted-foreground italic">No environment data recorded</p>
            )}
          </CardContent>
        </Card>

        {/* Lab Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Lab Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow
              label="Clearance Required"
              value={survey.clearance_required ? 'Yes' : 'No'}
            />
            <DetailRow label="Clearance Lab" value={survey.clearance_lab} />
            <p className="text-xs text-muted-foreground italic pt-2 border-t">
              Lab result attachments coming soon
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <SurveyDetailTabs survey={survey} onSurveyChange={loadSurvey} />
    </div>
  )
}
