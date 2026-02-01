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

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(id, company_name, name, email),
      crew:job_crew(
        is_lead,
        profile:profiles(id, full_name)
      )
    `)
    .order('scheduled_start_date', { ascending: true })

  if (params.status) {
    query = query.eq('status', params.status)
  }

  if (params.from) {
    query = query.gte('scheduled_start_date', params.from)
  }

  if (params.to) {
    query = query.lte('scheduled_start_date', params.to)
  }

  const { data: jobsData } = await query

  // Transform data to handle nested arrays
  const jobs = (jobsData || []).map(job => ({
    ...job,
    customer: Array.isArray(job.customer) ? job.customer[0] : job.customer,
  }))

  // Stats
  const stats = {
    total: jobs.length,
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

      <JobsDataTable data={jobs} />
    </div>
  )
}
