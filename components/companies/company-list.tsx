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
import { Building2, ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useCompanies, useCompanyStats } from '@/lib/hooks/use-companies'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { formatCurrency } from '@/lib/utils'
import type { AccountStatus, CompanyType } from '@/types/database'

const STATUS_COLORS: Record<string, string> = {
  prospect: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  churned: 'bg-red-100 text-red-700',
}

const COMPANY_TYPE_LABELS: Record<string, string> = {
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
  const [companyType, setCompanyType] = useState<CompanyType | 'all'>('all')
  const [activityFilter, setActivityFilter] = useState<'no_activity_30' | 'no_activity_90' | 'no_activity_365' | 'all'>('all')
  const [industry, setIndustry] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const pageSize = 25

  const debouncedSearch = useDebouncedValue(search, 300)
  const debouncedIndustry = useDebouncedValue(industry, 300)

  const queryOptions = useMemo(() => ({
    search: debouncedSearch,
    status,
    companyType,
    activityFilter,
    industry: debouncedIndustry || undefined,
    page,
    pageSize,
    sortBy,
    sortOrder,
  }), [debouncedSearch, status, companyType, activityFilter, debouncedIndustry, page, pageSize, sortBy, sortOrder])

  const { data: companies = [], isLoading, error } = useCompanies(queryOptions)
  const { data: stats } = useCompanyStats()

  const handleClearFilters = useCallback(() => {
    setStatus('all')
    setCompanyType('all')
    setActivityFilter('all')
    setIndustry('')
    setSearch('')
    setShowAdvanced(false)
    setPage(1)
  }, [])

  const hasNextPage = companies.length === pageSize
  const hasPrevPage = page > 1
  const hasFilters = status !== 'all' || companyType !== 'all' || search !== '' || activityFilter !== 'all' || industry !== ''

  const toggleSort = useCallback((column: string) => {
    if (sortBy === column) {
      setSortOrder((o) => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
    setPage(1)
  }, [sortBy])

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortOrder === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />
  }

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
          <Select value={companyType} onValueChange={(v) => { setCompanyType(v as CompanyType | 'all'); setPage(1) }}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Company Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? 'Less' : 'More'}
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>Clear</Button>
          )}
        </div>
      </div>

      {/* Advanced Filters Row */}
      {showAdvanced && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={activityFilter} onValueChange={(v) => { setActivityFilter(v as typeof activityFilter); setPage(1) }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Activity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Activity</SelectItem>
              <SelectItem value="no_activity_30">No activity 30d</SelectItem>
              <SelectItem value="no_activity_90">No activity 90d</SelectItem>
              <SelectItem value="no_activity_365">No activity 1yr+</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative max-w-[200px]">
            <Input
              value={industry}
              onChange={(e) => { setIndustry(e.target.value); setPage(1) }}
              placeholder="Filter by industry..."
              className="text-sm"
            />
          </div>
        </div>
      )}

      {/* Total count */}
      {stats && (
        <div className="text-sm text-muted-foreground">
          {stats.total} total companies
          {hasFilters && ` \u00b7 ${companies.length} matching`}
        </div>
      )}

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
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                      <span className="flex items-center">Company<SortIcon column="name" /></span>
                    </TableHead>
                    <TableHead>Primary Contact</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('industry')}>
                      <span className="flex items-center">Industry<SortIcon column="industry" /></span>
                    </TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('account_status')}>
                      <span className="flex items-center">Status<SortIcon column="account_status" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('total_jobs_completed')}>
                      <span className="flex items-center justify-end">Jobs<SortIcon column="total_jobs_completed" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('lifetime_value')}>
                      <span className="flex items-center justify-end">Lifetime Value<SortIcon column="lifetime_value" /></span>
                    </TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('updated_at')}>
                      <span className="flex items-center">Last Activity<SortIcon column="updated_at" /></span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => {
                    const statusColor = STATUS_COLORS[company.account_status] || STATUS_COLORS[company.status] || ''
                    const displayStatus = company.account_status || company.status
                    const location = [
                      company.service_city || company.billing_city,
                      company.service_state || company.billing_state,
                    ].filter(Boolean).join(', ')
                    const contactName = company.primary_contact
                      ? [company.primary_contact.first_name, company.primary_contact.last_name].filter(Boolean).join(' ') || company.primary_contact.name || null
                      : null
                    const contactPhone = company.primary_contact?.mobile_phone ?? null
                    const insuranceCarrier = company.primary_contact?.insurance_carrier ?? null

                    return (
                      <TableRow key={company.id} className="group">
                        <TableCell>
                          <Link href={`/crm/companies/${company.id}`} className="font-medium text-primary hover:underline">
                            {company.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {contactName ? (
                            <div>
                              <div className="text-sm">{contactName}</div>
                              {contactPhone && (
                                <div className="text-xs text-muted-foreground">{contactPhone}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {company.industry || '\u2014'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {location || '\u2014'}
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
                          {company.lifetime_value ? formatCurrency(company.lifetime_value, false) : '\u2014'}
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[120px]">
                          {insuranceCarrier || <span className="text-muted-foreground">&mdash;</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {company.updated_at ? (
                            <span className={
                              new Date(company.updated_at) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                                ? 'text-amber-600 font-medium' : ''
                            }>
                              {new Date(company.updated_at).toLocaleDateString()}
                            </span>
                          ) : '\u2014'}
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
