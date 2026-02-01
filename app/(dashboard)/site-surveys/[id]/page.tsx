'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { SurveyStatusBadge, HazardTypeBadge } from '@/components/surveys/survey-status-badge'
import { SurveyDetailTabs } from './survey-detail-tabs'
import { SurveyActions } from './survey-actions'
import type { SiteSurvey } from '@/types/database'

type SurveyWithRelations = SiteSurvey & {
  customer?: {
    id: string
    company_name: string | null
    first_name: string
    last_name: string
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
          customer:customers(id, company_name, first_name, last_name, email, phone),
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
      console.error('Error loading survey:', error)
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
    ? survey.customer.company_name || `${survey.customer.first_name} ${survey.customer.last_name}`
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
          <SurveyActions survey={survey} />

          {survey.status === 'reviewed' && (
            <Button asChild>
              <Link href={`/estimates/new?survey=${survey.id}`}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Estimate
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <SurveyDetailTabs survey={survey} />
    </div>
  )
}
