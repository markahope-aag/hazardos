'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Briefcase, Plus, DollarSign, Clock, CheckCircle, Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { formatCurrency } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  on_hold: { label: 'On Hold', color: 'bg-orange-100 text-orange-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  invoiced: { label: 'Invoiced', color: 'bg-purple-100 text-purple-700' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
}

function getPaymentStatus(job: Record<string, unknown>): { label: string; color: string } {
  if (job.status === 'paid' || job.final_payment_date) return { label: 'Paid', color: 'bg-emerald-100 text-emerald-700' }
  if (job.status === 'cancelled') return { label: '—', color: '' }
  // Check if overdue (invoice sent but not paid, past due date)
  if ((job.final_invoice_date || job.status === 'invoiced') && job.invoice_due_date) {
    const dueDate = new Date(job.invoice_due_date as string)
    if (dueDate < new Date()) return { label: 'Overdue', color: 'bg-red-100 text-red-700' }
  }
  if (job.final_invoice_date || job.status === 'invoiced') return { label: 'Invoiced', color: 'bg-purple-100 text-purple-700' }
  if (job.deposit_received_date) return { label: 'Deposit Received', color: 'bg-blue-100 text-blue-700' }
  if (job.status === 'completed') return { label: 'Pending Invoice', color: 'bg-amber-100 text-amber-700' }
  if (job.status === 'in_progress' || job.status === 'scheduled') return { label: 'Not Yet Billed', color: 'bg-gray-100 text-gray-400' }
  return { label: '—', color: '' }
}

export default function CrmJobsPage() {
  const { organization } = useMultiTenantAuth()
  // Seed filters from URL so the dashboard "Jobs this month" card lands
  // on the right slice of data. Users can still override from the UI.
  const searchParamsUrl = useSearchParams()
  const initialStatus = searchParamsUrl?.get('status') || 'all'
  const initialHazard = searchParamsUrl?.get('hazard_type') || searchParamsUrl?.get('hazardType') || 'all'
  const initialDateFrom = searchParamsUrl?.get('date_from') || ''
  const initialDateTo = searchParamsUrl?.get('date_to') || ''

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [hazardFilter, setHazardFilter] = useState(initialHazard)
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)
  const [page, setPage] = useState(1)
  const pageSize = 25
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['crm-jobs', organization?.id, debouncedSearch, statusFilter, hazardFilter, dateFrom, dateTo, page],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('jobs')
        .select(`
          *,
          customer:customers!customer_id(id, name, first_name, last_name, company_name, company_id),
          company:companies!company_id(id, name),
          crew:job_crew!job_id(id, profile:profiles!profile_id(id, first_name, last_name))
        `, { count: 'exact' })
        .order('scheduled_start_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (debouncedSearch) {
        query = query.or(`job_number.ilike.%${debouncedSearch}%,name.ilike.%${debouncedSearch}%,job_address.ilike.%${debouncedSearch}%`)
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (hazardFilter !== 'all') {
        query = query.contains('hazard_types', [hazardFilter])
      }
      if (dateFrom) {
        query = query.gte('scheduled_start_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('scheduled_start_date', dateTo)
      }

      const { data: jobs, count, error } = await query
      if (error) throw error
      return {
        jobs: (jobs || []).map(j => ({
          ...j,
          customer: Array.isArray(j.customer) ? j.customer[0] : j.customer,
          company: Array.isArray(j.company) ? j.company[0] : j.company,
          crew: Array.isArray(j.crew) ? j.crew : [],
        })),
        total: count || 0,
      }
    },
    enabled: !!organization?.id,
    staleTime: 30000,
  })

  const jobs = useMemo(() => data?.jobs || [], [data?.jobs])
  const hasNextPage = jobs.length === pageSize
  const hasPrevPage = page > 1
  const hasFilters = statusFilter !== 'all' || hazardFilter !== 'all' || dateFrom !== '' || dateTo !== '' || search !== ''

  const stats = useMemo(() => ({
    total: data?.total || 0,
    scheduled: jobs.filter(j => j.status === 'scheduled').length,
    in_progress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    revenue: jobs.reduce((sum, j) => sum + (j.actual_revenue || j.estimated_revenue || j.contract_amount || 0), 0),
  }), [jobs, data?.total])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">Manage scheduled and completed jobs</p>
        </div>
        <Button asChild><Link href="/jobs/new"><Plus className="h-4 w-4 mr-2" />New Job</Link></Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Total</span></div><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /><span className="text-sm text-muted-foreground">Scheduled</span></div><p className="text-2xl font-bold">{stats.scheduled}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /><span className="text-sm text-muted-foreground">In Progress</span></div><p className="text-2xl font-bold">{stats.in_progress}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-sm text-muted-foreground">Completed</span></div><p className="text-2xl font-bold">{stats.completed}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-purple-500" /><span className="text-sm text-muted-foreground">Revenue</span></div><p className="text-2xl font-bold">{formatCurrency(stats.revenue, false)}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search job number, company, address..." className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={hazardFilter} onValueChange={(v) => { setHazardFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Job Type</SelectItem>
              <SelectItem value="asbestos_friable">Asbestos (Friable)</SelectItem>
              <SelectItem value="asbestos_non_friable">Asbestos (Non-Friable)</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="mold">Mold</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="w-[140px]" placeholder="From" />
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="w-[140px]" placeholder="To" />
          {hasFilters && <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setHazardFilter('all'); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1) }}>Clear</Button>}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">{hasFilters ? 'No jobs found' : 'No jobs yet'}</h3>
              <p className="text-gray-500">{hasFilters ? 'Try adjusting your filters' : 'Jobs are created from won opportunities'}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Company / Contact</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assigned Tech</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const contactName = job.customer ? [job.customer.first_name, job.customer.last_name].filter(Boolean).join(' ') || job.customer.name : null
                    const companyName = job.company?.name || job.customer?.company_name
                    const sc = STATUS_CONFIG[job.status] || { label: job.status, color: '' }
                    const firstCrew = job.crew?.[0]?.profile
                    const techName = firstCrew ? [firstCrew.first_name, firstCrew.last_name].filter(Boolean).join(' ') : null
                    const primaryHazard = job.hazard_types?.[0]

                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Link href={`/crm/jobs/${job.id}`} className="font-medium text-primary hover:underline">{job.job_number}</Link>
                          <div className="text-sm text-muted-foreground truncate max-w-[180px]">{job.name}</div>
                        </TableCell>
                        <TableCell>
                          {companyName && <div className="text-sm font-medium">{companyName}</div>}
                          {contactName && (
                            <Link href={`/crm/contacts/${job.customer?.id}`} className="text-xs text-muted-foreground hover:underline">{contactName}</Link>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {[job.job_city, job.job_state].filter(Boolean).join(', ') || job.job_address?.substring(0, 30) || '—'}
                        </TableCell>
                        <TableCell>
                          {primaryHazard ? (
                            <Badge variant="outline" className="text-xs capitalize">{primaryHazard.replace(/_/g, ' ')}</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {/* TODO: also search by tech name */}
                          {techName || '—'}
                        </TableCell>
                        <TableCell><Badge className={`text-xs border-0 ${sc.color}`}>{sc.label}</Badge></TableCell>
                        <TableCell className="text-sm">
                          {job.scheduled_start_date ? (
                            <div>
                              <div>{new Date(job.scheduled_start_date).toLocaleDateString()}</div>
                              {job.scheduled_end_date && <div className="text-xs text-muted-foreground">to {new Date(job.scheduled_end_date).toLocaleDateString()}</div>}
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(job.actual_revenue || job.estimated_revenue || job.contract_amount) ? formatCurrency(job.actual_revenue || job.estimated_revenue || job.contract_amount || 0, false) : '—'}
                        </TableCell>
                        <TableCell>
                          {(() => { const ps = getPaymentStatus(job); return <Badge className={`text-xs border-0 ${ps.color}`}>{ps.label}</Badge> })()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {(hasNextPage || hasPrevPage) && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-gray-500">Page {page}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!hasPrevPage}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasNextPage}>Next <ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
