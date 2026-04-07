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
import { Users, ChevronLeft, ChevronRight, Search, Phone, Mail, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useCustomers, useCustomerStats } from '@/lib/hooks/use-customers'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import type { Customer, CustomerStatus, ContactType } from '@/types/database'

interface CustomerListProps {
  onEditCustomer: (customer: Customer) => void
  onDeleteCustomer: (customer: Customer) => void
}

const STATUS_COLORS: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700',
  prospect: 'bg-yellow-100 text-yellow-700',
  customer: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
}

const CONTACT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  do_not_contact: 'bg-red-100 text-red-700',
}

export default function CustomerList({ onEditCustomer: _onEditCustomer, onDeleteCustomer: _onDeleteCustomer }: CustomerListProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CustomerStatus | 'all'>('all')
  const [contactType, setContactType] = useState<ContactType | 'all'>('all')
  const [activityFilter, setActivityFilter] = useState<'no_contact_30' | 'no_contact_90' | 'no_contact_365' | 'all'>('all')
  const [hasOpenJobs, setHasOpenJobs] = useState<boolean | 'all'>('all')
  const [insuranceCarrier, setInsuranceCarrier] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const pageSize = 25

  const debouncedSearch = useDebouncedValue(search, 300)

  const debouncedInsurance = useDebouncedValue(insuranceCarrier, 300)

  const queryOptions = useMemo(() => ({
    search: debouncedSearch,
    status,
    contactType,
    activityFilter,
    hasOpenJobs,
    insuranceCarrier: debouncedInsurance || undefined,
    page,
    pageSize,
    sortBy,
    sortOrder,
  }), [debouncedSearch, status, contactType, activityFilter, hasOpenJobs, debouncedInsurance, page, pageSize, sortBy, sortOrder])

  const { data: customers = [], isLoading, error } = useCustomers(queryOptions)
  const { data: stats } = useCustomerStats()

  const handleClearFilters = useCallback(() => {
    setStatus('all')
    setContactType('all')
    setActivityFilter('all')
    setHasOpenJobs('all')
    setInsuranceCarrier('')
    setSearch('')
    setShowAdvanced(false)
    setPage(1)
  }, [])

  const hasNextPage = customers.length === pageSize
  const hasPrevPage = page > 1
  const hasFilters = status !== 'all' || contactType !== 'all' || search !== '' || activityFilter !== 'all' || hasOpenJobs !== 'all' || insuranceCarrier !== ''

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
          <div className="text-destructive mb-2">Error loading contacts</div>
          <div className="text-sm text-gray-500">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name, email, phone, company..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={contactType} onValueChange={(v) => { setContactType(v as ContactType | 'all'); setPage(1) }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v as CustomerStatus | 'all'); setPage(1) }}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
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
              <SelectItem value="no_contact_30">No contact 30d</SelectItem>
              <SelectItem value="no_contact_90">No contact 90d</SelectItem>
              <SelectItem value="no_contact_365">No contact 1yr+</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(hasOpenJobs)} onValueChange={(v) => { setHasOpenJobs(v === 'all' ? 'all' : v === 'true'); setPage(1) }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Jobs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contacts</SelectItem>
              <SelectItem value="true">Has Open Jobs</SelectItem>
              <SelectItem value="false">No Open Jobs</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative max-w-[200px]">
            <Input
              value={insuranceCarrier}
              onChange={(e) => { setInsuranceCarrier(e.target.value); setPage(1) }}
              placeholder="Insurance carrier..."
              className="text-sm"
            />
          </div>
        </div>
      )}

      {/* Total count */}
      {stats && (
        <div className="text-sm text-muted-foreground">
          {stats.total} total contacts
          {hasFilters && ` · ${customers.length} matching`}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[160px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {hasFilters ? 'No contacts found' : 'No contacts yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {hasFilters ? 'Try adjusting your search or filters' : 'Get started by adding your first contact'}
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
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('first_name')}>
                      <span className="flex items-center">Name<SortIcon column="first_name" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('company_name')}>
                      <span className="flex items-center">Company<SortIcon column="company_name" /></span>
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('contact_type')}>
                      <span className="flex items-center">Type<SortIcon column="contact_type" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                      <span className="flex items-center">Status<SortIcon column="status" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('lifetime_value')}>
                      <span className="flex items-center">Value<SortIcon column="lifetime_value" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('total_jobs')}>
                      <span className="flex items-center">Jobs<SortIcon column="total_jobs" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('last_job_date')}>
                      <span className="flex items-center">Last Job<SortIcon column="last_job_date" /></span>
                    </TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Insurance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer: Customer & { open_jobs_count?: number }) => {
                    const displayName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.name
                    const statusColor = STATUS_COLORS[customer.status] || ''
                    const contactStatusColor = CONTACT_STATUS_COLORS[customer.contact_status] || ''
                    const openJobCount = (customer as Record<string, unknown>).open_jobs_count as number || 0

                    return (
                      <TableRow key={customer.id} className="group">
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Link href={`/crm/contacts/${customer.id}`} className="font-medium text-primary hover:underline">
                                {displayName}
                              </Link>
                              {openJobCount > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700" title={`${openJobCount} open job${openJobCount > 1 ? 's' : ''}`}>
                                  {openJobCount} active
                                </span>
                              )}
                            </div>
                            {customer.title && (
                              <div className="text-xs text-muted-foreground">{customer.title}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.company_name ? (
                            <span className="text-sm">{customer.company_name}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {customer.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate max-w-[160px]">{customer.email}</span>
                              </div>
                            )}
                            {(customer.mobile_phone || customer.office_phone || customer.phone) && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{customer.mobile_phone || customer.office_phone || customer.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {customer.contact_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge className={`text-xs border-0 ${statusColor}`}>
                              {customer.status}
                            </Badge>
                            {customer.contact_status && customer.contact_status !== 'active' && (
                              <Badge className={`text-xs border-0 block w-fit ${contactStatusColor}`}>
                                {customer.contact_status.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums">
                          {customer.lifetime_value > 0 ? (
                            <span className="font-medium">${customer.lifetime_value.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-center tabular-nums">
                          {customer.total_jobs > 0 ? customer.total_jobs : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {customer.last_job_date ? (
                            <div>
                              <div className={
                                new Date(customer.last_job_date) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                                  ? 'text-amber-600 font-medium' : ''
                              }>
                                {new Date(customer.last_job_date).toLocaleDateString()}
                              </div>
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">
                          {customer.referral_source || customer.lead_source || '—'}
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[120px]">
                          {customer.insurance_carrier || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
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
