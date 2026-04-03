'use client'

import { useState, useMemo, useCallback } from 'react'
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
import { Building2, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useCompanies } from '@/lib/hooks/use-companies'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { formatCurrency } from '@/lib/utils'
import type { AccountStatus } from '@/types/database'

const STATUS_COLORS: Record<string, string> = {
  prospect: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  churned: 'bg-red-100 text-red-700',
}

const TYPE_LABELS: Record<string, string> = {
  residential_property_mgr: 'Residential PM',
  commercial_property_mgr: 'Commercial PM',
  general_contractor: 'General Contractor',
  industrial: 'Industrial',
  hoa: 'HOA',
  government: 'Government',
  direct_homeowner: 'Direct Homeowner',
  other: 'Other',
}

export default function CompanyList() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AccountStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 25

  const debouncedSearch = useDebouncedValue(search, 300)

  const queryOptions = useMemo(() => ({
    search: debouncedSearch,
    status: status === 'all' ? undefined : status,
    page,
    pageSize,
  }), [debouncedSearch, status, page, pageSize])

  const { data: companies = [], isLoading, error } = useCompanies(queryOptions)

  const handleClearFilters = useCallback(() => {
    setStatus('all')
    setSearch('')
    setPage(1)
  }, [])

  const hasNextPage = companies.length === pageSize
  const hasPrevPage = page > 1
  const hasFilters = status !== 'all' || search !== ''

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-destructive mb-2">Error loading companies</div>
          <div className="text-sm text-gray-500">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search company name, phone, email..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={(v) => { setStatus(v as AccountStatus | 'all'); setPage(1) }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="churned">Churned</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>Clear</Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[160px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {hasFilters ? 'No companies found' : 'No companies yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {hasFilters ? 'Try adjusting your search or filters' : 'Companies are created when adding a commercial contact'}
              </p>
              {hasFilters && (
                <Button variant="outline" onClick={handleClearFilters}>Clear filters</Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Jobs</TableHead>
                    <TableHead className="text-right">Lifetime Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => {
                    const statusColor = STATUS_COLORS[company.account_status] || STATUS_COLORS[company.status] || ''
                    const displayStatus = company.account_status || company.status

                    return (
                      <TableRow key={company.id} className="group">
                        <TableCell>
                          <Link href={`/crm/companies/${company.id}`} className="font-medium text-primary hover:underline">
                            {company.name}
                          </Link>
                          {company.industry && (
                            <div className="text-xs text-muted-foreground">{company.industry}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {company.company_type ? (
                            <span className="text-sm">{TYPE_LABELS[company.company_type] || company.company_type}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {company.primary_phone || company.phone || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {[company.billing_city, company.billing_state].filter(Boolean).join(', ') || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs border-0 ${statusColor}`}>
                            {displayStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {company.total_jobs_completed || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {company.lifetime_value ? formatCurrency(company.lifetime_value, false) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {(hasNextPage || hasPrevPage) && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-gray-500">Page {page}</div>
                  <div className="flex items-center gap-2">
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
