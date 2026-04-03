'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Target, Plus, DollarSign, TrendingUp, Search, Kanban, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { formatCurrency } from '@/lib/utils'

const URGENCY_COLORS: Record<string, string> = {
  routine: 'bg-gray-100 text-gray-600',
  urgent: 'bg-yellow-100 text-yellow-700',
  emergency: 'bg-red-100 text-red-700',
}

export default function OpportunitiesPage() {
  const { organization } = useMultiTenantAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 25
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities', organization?.id, debouncedSearch, statusFilter, urgencyFilter, page],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('opportunities')
        .select(`
          *,
          stage:pipeline_stages!stage_id(id, name, color, probability),
          customer:customers!customer_id(id, name, first_name, last_name, company_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%`)
      }
      if (statusFilter !== 'all') {
        query = query.eq('opportunity_status', statusFilter)
      }
      if (urgencyFilter !== 'all') {
        query = query.eq('urgency', urgencyFilter)
      }

      const { data: opps, count, error } = await query
      if (error) throw error
      return { opportunities: opps || [], total: count || 0 }
    },
    enabled: !!organization?.id,
    staleTime: 30000,
  })

  const opportunities = data?.opportunities || []
  const total = data?.total || 0
  const hasNextPage = opportunities.length === pageSize
  const hasPrevPage = page > 1
  const hasFilters = statusFilter !== 'all' || urgencyFilter !== 'all' || search !== ''

  // Stats from loaded data
  const stats = useMemo(() => ({
    count: total,
    totalValue: opportunities.reduce((sum, o) => sum + (o.estimated_value || 0), 0),
    weightedValue: opportunities.reduce((sum, o) => sum + (o.weighted_value || 0), 0),
  }), [opportunities, total])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Opportunities</h1>
          <p className="text-muted-foreground">All open and closed opportunities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/crm/pipeline"><Kanban className="h-4 w-4 mr-2" />View Pipeline</Link>
          </Button>
          <Button asChild>
            <Link href="/crm/opportunities/new"><Plus className="h-4 w-4 mr-2" />New Opportunity</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.count}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(stats.totalValue, false)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(stats.weightedValue, false)}</div></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search opportunities..." className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="assessment_scheduled">Assessment Scheduled</SelectItem>
              <SelectItem value="estimate_sent">Estimate Sent</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="no_decision">No Decision</SelectItem>
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={(v) => { setUrgencyFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Urgency</SelectItem>
              <SelectItem value="routine">Routine</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setUrgencyFilter('all'); setSearch(''); setPage(1) }}>Clear</Button>}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">{hasFilters ? 'No opportunities found' : 'No opportunities yet'}</h3>
              <p className="text-gray-500 mb-4">{hasFilters ? 'Try adjusting your filters' : 'Create your first opportunity to start tracking your pipeline'}</p>
              {!hasFilters && (
                <Button asChild><Link href="/crm/opportunities/new"><Plus className="h-4 w-4 mr-2" />New Opportunity</Link></Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opportunity</TableHead>
                    <TableHead>Company / Contact</TableHead>
                    <TableHead>Hazards</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Expected Close</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp) => {
                    const customer = Array.isArray(opp.customer) ? opp.customer[0] : opp.customer
                    const stage = Array.isArray(opp.stage) ? opp.stage[0] : opp.stage
                    const contactName = customer ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.name : null

                    return (
                      <TableRow key={opp.id}>
                        <TableCell>
                          <Link href={`/crm/opportunities/${opp.id}`} className="font-medium text-primary hover:underline">
                            {opp.name}
                          </Link>
                          {opp.service_city && opp.service_state && (
                            <div className="text-xs text-muted-foreground">{opp.service_city}, {opp.service_state}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer && (
                            <div>
                              <Link href={`/crm/contacts/${customer.id}`} className="text-sm hover:underline">{contactName}</Link>
                              {customer.company_name && <div className="text-xs text-muted-foreground">{customer.company_name}</div>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {opp.hazard_types?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {opp.hazard_types.map((h: string) => (
                                <Badge key={h} variant="outline" className="text-xs">{h.replace(/_/g, ' ')}</Badge>
                              ))}
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {stage && (
                            <Badge style={{ backgroundColor: stage.color, color: 'white' }} className="border-0">{stage.name}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {opp.estimated_value ? (
                            <div>
                              <div className="font-medium">{formatCurrency(opp.estimated_value, false)}</div>
                              {opp.weighted_value && <div className="text-xs text-muted-foreground">{formatCurrency(opp.weighted_value, false)} weighted</div>}
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {opp.urgency ? (
                            <Badge className={`text-xs border-0 ${URGENCY_COLORS[opp.urgency] || ''}`}>{opp.urgency}</Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : '—'}
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
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!hasPrevPage}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasNextPage}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
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
