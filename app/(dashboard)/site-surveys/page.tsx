'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, MapPin, Calendar, User, Eye, MoreHorizontal, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { format } from 'date-fns'

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
}

export default function SiteSurveysPage() {
  const { organization } = useMultiTenantAuth()
  const searchParams = useSearchParams()
  const [surveys, setSurveys] = useState<SurveyWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  // Parse search params
  const filters = useMemo(() => ({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'all',
    technician: searchParams.get('technician') || 'all',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
  }), [searchParams])

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
          customer:customers(id, company_name, name),
          technician:profiles!assigned_to(id, first_name, last_name)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
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
      })) as SurveyWithRelations[]

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
    } finally {
      setLoading(false)
    }
  }, [organization?.id, filters])

  useEffect(() => {
    loadSurveys()
  }, [loadSurveys])

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return surveys.reduce((acc, survey) => {
      acc[survey.status] = (acc[survey.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [surveys])

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
            <p className="text-muted-foreground">Manage and review site survey assessments</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Site Surveys</h1>
          <p className="text-muted-foreground">Manage and review site survey assessments</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/site-surveys/mobile">
            <Button variant="outline">
              <Smartphone className="h-4 w-4 mr-2" />
              Mobile Survey
            </Button>
          </Link>
          <CreateSurveyButton />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">
              {surveys.length}
            </div>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {statusCounts['scheduled'] || 0}
            </div>
            <p className="text-sm text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">
              {statusCounts['in_progress'] || 0}
            </div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {statusCounts['submitted'] || 0}
            </div>
            <p className="text-sm text-muted-foreground">Awaiting Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {statusCounts['reviewed'] || 0}
            </div>
            <p className="text-sm text-muted-foreground">Reviewed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <SurveyFilters />

      {/* Surveys Table */}
      {surveys.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filters.search || filters.status !== 'all' ? 'No surveys found' : 'No surveys yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.status !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by scheduling your first site survey'
              }
            </p>
            {!filters.search && filters.status === 'all' && (
              <CreateSurveyButton />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Survey</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveys.map((survey) => (
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
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatScheduledDate(survey)}
                    </div>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/site-surveys/${survey.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {survey.status === 'reviewed' && (
                          <DropdownMenuItem asChild>
                            <Link href={`/estimates/new?survey=${survey.id}`}>
                              Generate Estimate
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
