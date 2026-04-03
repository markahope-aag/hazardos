'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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

export default function CrmJobsPage() {
  const { organization } = useMultiTenantAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 25
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['crm-jobs', organization?.id, debouncedSearch, statusFilter, page],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('jobs')
        .select(`
          *,
          customer:customers!customer_id(id, name, first_name, last_name, company_name, company_id),
          company:companies!company_id(id, name)
        `, { count: 'exact' })
        .order('scheduled_start_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (debouncedSearch) {
        query = query.or(`job_number.ilike.%${debouncedSearch}%,name.ilike.%${debouncedSearch}%,job_address.ilike.%${debouncedSearch}%`)
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data: jobs, count, error } = await query
      if (error) throw error
      return {
        jobs: (jobs || []).map(j => ({
          ...j,
          customer: Array.isArray(j.customer) ? j.customer[0] : j.customer,
          company: Array.isArray(j.company) ? j.company[0] : j.company,
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
  const hasFilters = statusFilter !== 'all' || search !== ''

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
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setSearch(''); setPage(1) }}>Clear</Button>}
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
                    <TableHead>Hazards</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const contactName = job.customer ? [job.customer.first_name, job.customer.last_name].filter(Boolean).join(' ') || job.customer.name : null
                    const companyName = job.company?.name || job.customer?.company_name
                    const sc = STATUS_CONFIG[job.status] || { label: job.status, color: '' }

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
                          {job.hazard_types?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {job.hazard_types.map((h: string) => <Badge key={h} variant="outline" className="text-xs">{h.replace(/_/g, ' ')}</Badge>)}
                            </div>
                          ) : '—'}
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
