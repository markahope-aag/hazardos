import { createClient } from '@/lib/supabase/server'
import { JobsDataTable } from './data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Calendar,
  Clock,
  CheckCircle,
  DollarSign,
  Plus,
  Briefcase
} from 'lucide-react'
import Link from 'next/link'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'

// Re-query on every navigation. Without force-dynamic, Next.js may serve
// a cached render from before the user just created a job, and the list
// appears empty even though the record exists.
export const dynamic = 'force-dynamic'

// X22: paginate server-side. This page previously fetched EVERY job (select *
// + joins, no limit) and handed the whole array to the client, which filtered
// and rendered all rows into the DOM — unresponsive at 500+ jobs and silently
// truncated at PostgREST's ~1000-row cap. Now the fetch is bounded by .range()
// and all filters (search, status, location, date) run server-side, so
// pagination spans the whole filtered set rather than a single page.
const PAGE_SIZE = 25

interface JobsSearchParams {
  status?: string
  from?: string
  to?: string
  q?: string
  location?: string
  page?: string
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<JobsSearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const page = Math.max(1, Number.parseInt(params.page || '1', 10) || 1)
  const rawSearch = (params.q || '').trim()
  const search = rawSearch ? sanitizeSearchQuery(rawSearch) : ''

  // Customer name is on the joined customers table, so a text search that
  // should match the customer can't be expressed as a column filter on jobs.
  // Resolve matching customer ids first, then include them in the OR — the
  // same approach the CRM jobs list uses for crew-name search.
  let customerIds: string[] = []
  if (search) {
    const { data: matches } = await supabase
      .from('customers')
      .select('id')
      .or(`name.ilike.%${search}%,company_name.ilike.%${search}%`)
    customerIds = (matches || []).map((c) => c.id as string)
  }

  let query = supabase
    .from('jobs')
    .select(`
      *,
      customer:customers!customer_id(id, company_name, name, email),
      crew:job_crew(
        is_lead,
        profile:profiles(id, full_name)
      )
    `, { count: 'exact' })
    .order('scheduled_start_date', { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (params.status) {
    query = query.eq('status', params.status)
  }
  if (params.from) {
    query = query.gte('scheduled_start_date', params.from)
  }
  if (params.to) {
    query = query.lte('scheduled_start_date', params.to)
  }
  if (params.location) {
    query = params.location === 'unassigned'
      ? query.is('location_id', null)
      : query.eq('location_id', params.location)
  }
  if (search) {
    const orParts = [
      `job_number.ilike.%${search}%`,
      `name.ilike.%${search}%`,
      `job_address.ilike.%${search}%`,
    ]
    if (customerIds.length > 0) {
      orParts.push(`customer_id.in.(${customerIds.join(',')})`)
    }
    query = query.or(orParts.join(','))
  }

  const { data: jobsData, count } = await query

  // Transform data to handle nested arrays
  const jobs = (jobsData || []).map(job => ({
    ...job,
    customer: Array.isArray(job.customer) ? job.customer[0] : job.customer,
  }))

  const total = count || 0

  // Total is the exact count of the filtered set; the status breakdown is
  // computed over the current page, matching the CRM jobs list's behavior.
  const stats = {
    total,
    scheduled: jobs.filter(j => j.status === 'scheduled').length,
    in_progress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    invoiced: jobs.filter(j => j.status === 'invoiced').length,
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">
            Manage scheduled and completed jobs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar View
            </Link>
          </Button>
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Scheduled</span>
            </div>
            <p className="text-2xl font-bold">{stats.scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">In Progress</span>
            </div>
            <p className="text-2xl font-bold">{stats.in_progress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Invoiced</span>
            </div>
            <p className="text-2xl font-bold">{stats.invoiced}</p>
          </CardContent>
        </Card>
      </div>

      <JobsDataTable
        data={jobs}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        filters={{
          q: rawSearch,
          status: params.status || 'all',
          location: params.location || 'all',
        }}
      />
    </div>
  )
}
