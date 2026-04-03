import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Calendar, Clock, CheckCircle, DollarSign, Plus, Briefcase, AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { label: 'Scheduled', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'default' },
  on_hold: { label: 'On Hold', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
  invoiced: { label: 'Invoiced', variant: 'secondary' },
  paid: { label: 'Paid', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export default async function CrmJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(id, name, first_name, last_name, company_name),
      company:companies(id, name),
      crew_lead:profiles!jobs_crew_lead_id_fkey(id, full_name)
    `)
    .order('scheduled_start_date', { ascending: true })

  if (params.status) {
    query = query.eq('status', params.status)
  }

  const { data: jobsData } = await query

  const jobs = (jobsData || []).map(job => ({
    ...job,
    customer: Array.isArray(job.customer) ? job.customer[0] : job.customer,
    company: Array.isArray(job.company) ? job.company[0] : job.company,
    crew_lead: Array.isArray(job.crew_lead) ? job.crew_lead[0] : job.crew_lead,
  }))

  const stats = {
    total: jobs.length,
    scheduled: jobs.filter(j => j.status === 'scheduled').length,
    in_progress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    total_revenue: jobs.reduce((sum, j) => sum + (j.actual_revenue || j.estimated_revenue || j.contract_amount || 0), 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">Manage scheduled and completed jobs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/calendar"><Calendar className="h-4 w-4 mr-2" />Calendar</Link>
          </Button>
          <Button asChild>
            <Link href="/jobs/new"><Plus className="h-4 w-4 mr-2" />New Job</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
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
              <span className="text-sm text-muted-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.total_revenue, false)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No jobs yet</h3>
              <p className="text-gray-500">Jobs are created from won opportunities</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Contact / Company</TableHead>
                  <TableHead>Hazards</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Crew Lead</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const contactName = job.customer
                    ? [job.customer.first_name, job.customer.last_name].filter(Boolean).join(' ') || job.customer.name
                    : null
                  const companyName = job.company?.name || job.customer?.company_name
                  const statusConfig = STATUS_CONFIG[job.status] || { label: job.status, variant: 'outline' as const }

                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Link href={`/jobs/${job.id}`} className="font-medium text-primary hover:underline">
                          {job.job_number}
                        </Link>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">{job.name}</div>
                      </TableCell>
                      <TableCell>
                        {contactName && (
                          <Link href={`/crm/contacts/${job.customer?.id}`} className="text-sm hover:underline">
                            {contactName}
                          </Link>
                        )}
                        {companyName && (
                          <div className="text-xs text-muted-foreground">{companyName}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.hazard_types && job.hazard_types.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {job.hazard_types.map((h: string) => (
                              <Badge key={h} variant="outline" className="text-xs">
                                {h.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        {job.containment_level && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {job.containment_level.replace('_', ' ').toUpperCase()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {job.scheduled_start_date && (
                          <div>{new Date(job.scheduled_start_date).toLocaleDateString()}</div>
                        )}
                        {job.scheduled_end_date && (
                          <div className="text-xs text-muted-foreground">
                            to {new Date(job.scheduled_end_date).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {(job.actual_revenue || job.estimated_revenue || job.contract_amount) ? (
                          <div className="font-medium">
                            {formatCurrency(job.actual_revenue || job.estimated_revenue || job.contract_amount || 0, false)}
                          </div>
                        ) : '—'}
                        {job.gross_margin_pct != null && (
                          <div className="text-xs text-muted-foreground">{job.gross_margin_pct}% margin</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {job.crew_lead?.full_name || '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
