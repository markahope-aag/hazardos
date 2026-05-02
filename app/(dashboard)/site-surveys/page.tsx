'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, MapPin, Calendar, User, Eye, MoreHorizontal, Smartphone, TrendingUp, AlertTriangle, DollarSign, Calculator, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { createClient } from '@/lib/supabase/client'
import { SurveyStatusBadge, HazardTypeBadge } from '@/components/surveys/survey-status-badge'
import { SurveyFilters } from './survey-filters'
import { CreateSurveyButton } from './create-survey-modal'
import { logger, formatError } from '@/lib/utils/logger'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'

const ESTIMATE_ELIGIBLE_STATUSES = ['completed', 'reviewed', 'submitted'] as const

interface SurveyWithRelations {
  id: string
  job_name: string
  customer_name: string
  customer_id: string | null
  site_address: string
  site_city: string
  site_state: string
  status: string
  hazard_type: string
  scheduled_date: string | null
  scheduled_time_start: string | null
  assigned_to: string | null
  created_at: string
  submitted_at: string | null
  version: number
  survey_root_id: string
  parent_survey_id: string | null
  chain_total: number
  customer?: {
    id: string
    company_name: string | null
    name: string
  } | null
  technician?: {
    id: string
    first_name: string | null
    last_name: string | null
  } | null
  job?: {
    id: string
    job_number: string
    status: string
  }[] | null
  estimate?: {
    id: string
    total: number
  }[] | null
}

export default function SiteSurveysPage() {
  const { organization } = useMultiTenantAuth()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [surveys, setSurveys] = useState<SurveyWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllVersions, setShowAllVersions] = useState(false)

  const isEstimatePickerMode = searchParams.get('action') === 'estimate'

  // Parse search params
  const filters = useMemo(() => ({
    search: searchParams.get('search') || '',
    view: (searchParams.get('view') || 'open') as
      'open' | 'completed' | 'converted' | 'cancelled' | 'all',
    technician: searchParams.get('technician') || 'all',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
  }), [searchParams])

  const displayedSurveys = useMemo(() => {
    // Default: collapse to the latest version per survey chain so the list
    // doesn't repeat superseded versions next to their replacements.
    const versionScoped = showAllVersions
      ? surveys
      : surveys.filter((s) => s.version === s.chain_total)

    if (isEstimatePickerMode) {
      return versionScoped.filter(s =>
        (ESTIMATE_ELIGIBLE_STATUSES as readonly string[]).includes(s.status) &&
        (s.estimate?.length ?? 0) === 0
      )
    }

    // View preset semantics:
    //   open       — still in the pipeline (not converted, not cancelled,
    //                and survey itself hasn't been closed as 'completed')
    //   completed  — terminal 'completed' status (closed, work done)
    //   converted  — has an estimate linked or status = 'estimated'
    //   cancelled  — status = 'cancelled'
    //   all        — show everything
    const hasEstimate = (s: SurveyWithRelations) => (s.estimate?.length ?? 0) > 0
    switch (filters.view) {
      case 'all':
        return versionScoped
      case 'completed':
        return versionScoped.filter(s => s.status === 'completed')
      case 'converted':
        return versionScoped.filter(s => s.status === 'estimated' || hasEstimate(s))
      case 'cancelled':
        return versionScoped.filter(s => s.status === 'cancelled')
      case 'open':
      default:
        return versionScoped.filter(
          s =>
            s.status !== 'cancelled' &&
            s.status !== 'completed' &&
            s.status !== 'estimated' &&
            !hasEstimate(s),
        )
    }
  }, [surveys, isEstimatePickerMode, filters.view, showAllVersions])

  const loadSurveys = useCallback(async () => {
    if (!organization?.id) return

    try {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('site_surveys')
        .select(`
          id,
          job_name,
          customer_name,
          customer_id,
          site_address,
          site_city,
          site_state,
          status,
          hazard_type,
          scheduled_date,
          scheduled_time_start,
          assigned_to,
          created_at,
          submitted_at,
          version,
          survey_root_id,
          parent_survey_id,
          customer:customers!customer_id(id, company_name, name),
          technician:profiles!assigned_to(id, first_name, last_name),
          job:jobs!site_survey_id(id, job_number, status),
          estimate:estimates!site_survey_id(id, total)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      // View-preset filtering lives in displayedSurveys (client-side)
      // since two of the presets (Converted, Open) depend on whether an
      // estimate row exists on the embed, not just the survey status.
      if (filters.technician && filters.technician !== 'all') {
        query = query.eq('assigned_to', filters.technician)
      }
      if (filters.from) {
        query = query.gte('scheduled_date', filters.from)
      }
      if (filters.to) {
        query = query.lte('scheduled_date', filters.to)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform data to flatten relations (Supabase returns arrays)
      const transformedData = (data || []).map(survey => ({
        ...survey,
        customer: Array.isArray(survey.customer) ? survey.customer[0] || null : survey.customer,
        technician: Array.isArray(survey.technician) ? survey.technician[0] || null : survey.technician,
        job: Array.isArray(survey.job) ? survey.job : survey.job ? [survey.job] : null,
        estimate: Array.isArray(survey.estimate) ? survey.estimate : survey.estimate ? [survey.estimate] : null,
        chain_total: 1, // overwritten below
      })) as SurveyWithRelations[]

      // Compute chain_total per row from the in-page result set. This works
      // because the same RLS-scoped query above pulls every version the
      // user can see — we just need MAX(version) GROUP BY survey_root_id.
      const chainTotalByRoot = new Map<string, number>()
      for (const s of transformedData) {
        const cur = chainTotalByRoot.get(s.survey_root_id) ?? 0
        if (s.version > cur) chainTotalByRoot.set(s.survey_root_id, s.version)
      }
      for (const s of transformedData) {
        s.chain_total = chainTotalByRoot.get(s.survey_root_id) ?? s.version
      }

      // Client-side search filter
      let filteredData = transformedData
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredData = filteredData.filter(survey =>
          survey.job_name?.toLowerCase().includes(searchLower) ||
          survey.customer_name?.toLowerCase().includes(searchLower) ||
          survey.site_address?.toLowerCase().includes(searchLower)
        )
      }

      setSurveys(filteredData)
    } catch (error) {
      logger.error(
        {
          error: formatError(error, 'SURVEYS_LOAD_ERROR'),
          organizationId: organization?.id
        },
        'Error loading surveys'
      )
      // Surface the real message so schema/permission drift doesn't hide
      // behind an empty table.
      const message =
        (error as { message?: string; details?: string } | null)?.message ||
        (error as { details?: string } | null)?.details ||
        'Could not load surveys.'
      toast({
        title: 'Could not load surveys',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [organization?.id, filters, toast])

  useEffect(() => {
    loadSurveys()
  }, [loadSurveys])

  const surveyStats = useMemo(() => {
    const total = surveys.length

    // Workflow buckets, mapped to the survey-status enum:
    //   scheduled / in_progress  → "Scheduled"       (appointment booked)
    //   submitted                → "Completed"       (tech finished paperwork)
    //   reviewed                 → "Awaiting Review" (office has seen it)
    //   estimated / has estimate → "Converted"
    //   completed / cancelled    → closed, not in Open
    const scheduled = surveys.filter(
      (s) => s.status === 'scheduled' || s.status === 'in_progress',
    ).length
    const completed = surveys.filter((s) => s.status === 'submitted').length
    const awaitingReview = surveys.filter((s) => s.status === 'reviewed').length
    const converted = surveys.filter(
      (s) => s.status === 'estimated' || (s.estimate?.length ?? 0) > 0,
    ).length

    const CLOSED_STATUSES = new Set(['completed', 'cancelled'])
    const totalOpen = surveys.filter(
      (s) => !CLOSED_STATUSES.has(s.status) && s.status !== 'estimated' && (s.estimate?.length ?? 0) === 0,
    ).length

    const today = new Date().toISOString().split('T')[0]
    const overdue = surveys.filter(
      s => s.status === 'scheduled' && s.scheduled_date && s.scheduled_date < today
    ).length

    // Pipeline value: revenue sitting on open surveys that could still
    // come in. A survey counts if it has an estimate and hasn't been
    // cancelled or fully converted to a (non-cancelled) job yet. Jobs
    // that materialize are tracked as won revenue elsewhere.
    const totalEstimateValue = surveys.reduce((sum, s) => {
      if (s.status === 'cancelled') return sum
      const linkedJob = s.job?.[0]
      if (linkedJob && linkedJob.status !== 'cancelled') return sum
      const est = s.estimate?.[0]
      return sum + (est?.total || 0)
    }, 0)

    void total // keep local for potential future use; silences unused-var
    return {
      totalOpen, scheduled, completed, awaitingReview, converted,
      overdue, totalEstimateValue,
    }
  }, [surveys])

  const getLinkedJob = (survey: SurveyWithRelations) => {
    return survey.job?.[0] || null
  }

  const getCustomerDisplayName = (survey: SurveyWithRelations) => {
    if (survey.customer) {
      return survey.customer.company_name || survey.customer.name
    }
    return survey.customer_name
  }

  const getTechnicianName = (survey: SurveyWithRelations) => {
    if (survey.technician) {
      return `${survey.technician.first_name || ''} ${survey.technician.last_name || ''}`.trim() || 'Unassigned'
    }
    return 'Unassigned'
  }

  const formatScheduledDate = (survey: SurveyWithRelations) => {
    if (!survey.scheduled_date) return '-'
    const date = format(new Date(survey.scheduled_date), 'MMM d, yyyy')
    if (survey.scheduled_time_start) {
      return `${date} at ${survey.scheduled_time_start}`
    }
    return date
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Site Surveys</h1>
            <p className="text-muted-foreground">Manage and review site surveys</p>
          </div>
        </div>

        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-full max-w-md"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEstimatePickerMode ? 'Select a Survey' : 'Site Surveys'}
          </h1>
          <p className="text-muted-foreground">
            {isEstimatePickerMode
              ? 'Estimates are generated from completed surveys. Pick one below.'
              : 'Manage and review site surveys'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEstimatePickerMode ? (
            <Link href="/estimates">
              <Button variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/site-surveys/mobile">
                <Button variant="outline">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile Survey
                </Button>
              </Link>
              <CreateSurveyButton onCreated={loadSurveys} />
            </>
          )}
        </div>
      </div>

      {isEstimatePickerMode && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
          <Calculator className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-blue-800">
            Showing surveys that are ready for an estimate (completed and not yet estimated).
          </span>
        </div>
      )}

      {/* Stats Cards — pipeline flow left to right, then the two
          operational signals (overdue / revenue). */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{surveyStats.totalOpen}</div>
            <p className="text-sm text-muted-foreground">Total Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{surveyStats.scheduled}</div>
            <p className="text-sm text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">{surveyStats.completed}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{surveyStats.awaitingReview}</div>
            <p className="text-sm text-muted-foreground">Awaiting Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <div className="text-2xl font-bold text-emerald-600">{surveyStats.converted}</div>
            </div>
            <p className="text-sm text-muted-foreground">Converted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="text-2xl font-bold text-red-600">{surveyStats.overdue}</div>
            </div>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-teal-600" />
              <div className="text-2xl font-bold text-teal-600">
                ${Math.round(surveyStats.totalEstimateValue).toLocaleString()}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Est. Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SurveyFilters />
        <Button
          variant={showAllVersions ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowAllVersions((v) => !v)}
          title={showAllVersions ? 'Showing every version' : 'Showing only the latest version per chain'}
        >
          {showAllVersions ? 'All versions' : 'Latest only'}
        </Button>
      </div>

      {/* Surveys Table */}
      {displayedSurveys.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              {isEstimatePickerMode ? (
                <Calculator className="h-8 w-8 text-gray-400" />
              ) : (
                <Plus className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isEstimatePickerMode
                ? 'No surveys ready to estimate'
                : filters.search || filters.view !== 'open'
                  ? 'No surveys found'
                  : 'No surveys yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isEstimatePickerMode
                ? 'Estimates are generated from completed surveys. Complete a survey, then return here.'
                : filters.search || filters.view !== 'open'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by scheduling your first site survey'}
            </p>
            {isEstimatePickerMode ? (
              <Link href="/estimates">
                <Button variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Back to Estimates
                </Button>
              </Link>
            ) : !filters.search && filters.view === 'open' ? (
              <CreateSurveyButton onCreated={loadSurveys} />
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Survey</TableHead>
                <TableHead className="w-[80px]">Version</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Linked Job</TableHead>
                <TableHead>Converted</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedSurveys.map((survey) => (
                <TableRow key={survey.id}>
                  <TableCell>
                    <Link
                      href={`/site-surveys/${survey.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {survey.job_name || `Survey #${survey.id.slice(0, 8)}`}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      v{survey.version} of {survey.chain_total}
                    </span>
                  </TableCell>
                  <TableCell>
                    {survey.customer_id ? (
                      <Link
                        href={`/customers/${survey.customer_id}`}
                        className="hover:underline"
                      >
                        {getCustomerDisplayName(survey)}
                      </Link>
                    ) : (
                      getCustomerDisplayName(survey)
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">
                        {survey.site_address}, {survey.site_city}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(survey.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatScheduledDate(survey)}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {survey.submitted_at
                      ? format(new Date(survey.submitted_at), 'MMM d, yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-3 w-3" />
                      {getTechnicianName(survey)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <SurveyStatusBadge status={survey.status} />
                  </TableCell>
                  <TableCell>
                    <HazardTypeBadge hazardType={survey.hazard_type} />
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const linkedJob = getLinkedJob(survey)
                      if (!linkedJob) return <span className="text-muted-foreground">—</span>
                      return (
                        <Link
                          href={`/crm/jobs/${linkedJob.id}`}
                          className="text-primary hover:underline font-medium text-sm"
                        >
                          {linkedJob.job_number}
                        </Link>
                      )
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const linkedJob = getLinkedJob(survey)
                      if (!linkedJob) return <span className="text-muted-foreground">—</span>
                      if (linkedJob.status === 'cancelled') {
                        return <Badge variant="secondary">Cancelled</Badge>
                      }
                      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Converted</Badge>
                    })()}
                  </TableCell>
                  <TableCell>
                    {isEstimatePickerMode ? (
                      <Link href={`/estimates/new?survey_id=${survey.id}`}>
                        <Button size="sm">
                          <Calculator className="h-4 w-4 mr-2" />
                          Generate Estimate
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Survey actions">
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Survey actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/site-surveys/${survey.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {(ESTIMATE_ELIGIBLE_STATUSES as readonly string[]).includes(survey.status) &&
                            (survey.estimate?.length ?? 0) === 0 && (
                              <DropdownMenuItem asChild>
                                <Link href={`/estimates/new?survey_id=${survey.id}`}>
                                  <Calculator className="h-4 w-4 mr-2" />
                                  Generate Estimate
                                </Link>
                              </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
