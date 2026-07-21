import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MobileListCard } from '@/components/ui/mobile-list-card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Users, ChevronLeft, ChevronRight, Search, Phone, Mail, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useCustomers, useCustomerStats } from '@/lib/hooks/use-customers'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { LocationFilter, type LocationFilterValue } from '@/components/locations/location-filter'
import BulkActionsToolbar from './bulk-actions-toolbar'
import type { Customer, CustomerStatus, ContactType } from '@/types/database'

interface CustomerListProps {
  onEditCustomer: (customer: Customer) => void
  onDeleteCustomer: (customer: Customer) => void
}

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-blue-100 text-blue-700',
  prospect: 'bg-yellow-100 text-yellow-700',
  customer: 'bg-green-100 text-green-700',
  past_customer: 'bg-indigo-100 text-indigo-700',
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
  const [locationId, setLocationId] = useState<LocationFilterValue>('all')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const pageSize = 25

  const debouncedSearch = useDebouncedValue(search, 300)

  const queryOptions = useMemo(() => ({
    search: debouncedSearch,
    status,
    contactType,
    activityFilter,
    hasOpenJobs,
    locationId,
    page,
    pageSize,
    sortBy,
    sortOrder,
  }), [debouncedSearch, status, contactType, activityFilter, hasOpenJobs, locationId, page, pageSize, sortBy, sortOrder])

  const { data: rawCustomers = [], isLoading, error } = useCustomers(queryOptions)
  // The hook over-fetches by one row to detect a next page; display only pageSize.
  const customers = rawCustomers.slice(0, pageSize)
  const { data: stats } = useCustomerStats()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Selection is scoped to the currently visible page — reset it whenever
  // the underlying query changes so stale ids from a previous page/filter
  // can't linger in a bulk action.
  useEffect(() => {
    setSelectedIds(new Set())
  }, [queryOptions])

  const toggleRowSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isAllSelected = customers.length > 0 && customers.every((c) => selectedIds.has(c.id))
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (customers.length > 0 && customers.every((c) => prev.has(c.id))) {
        return new Set()
      }
      return new Set(customers.map((c) => c.id))
    })
  }, [customers])

  const selectedCustomers = useMemo(
    () => customers.filter((c) => selectedIds.has(c.id)),
    [customers, selectedIds]
  )

  const handleClearFilters = useCallback(() => {
    setStatus('all')
    setContactType('all')
    setActivityFilter('all')
    setHasOpenJobs('all')
    setLocationId('all')
    setSearch('')
    setShowAdvanced(false)
    setPage(1)
  }, [])

  // A next page exists iff the hook returned the extra (pageSize+1)-th row.
  const hasNextPage = rawCustomers.length > pageSize
  const hasPrevPage = page > 1
  const hasFilters = status !== 'all' || contactType !== 'all' || search !== '' || activityFilter !== 'all' || hasOpenJobs !== 'all' || locationId !== 'all'

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

  const ariaSortFor = (column: string): 'ascending' | 'descending' | 'none' =>
    sortBy === column ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'

  const SortableHead = ({ column, label, className }: { column: string; label: string; className?: string }) => (
    <TableHead className={className} aria-sort={ariaSortFor(column)}>
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="flex items-center select-none hover:text-foreground transition-colors"
      >
        {label}<SortIcon column={column} />
      </button>
    </TableHead>
  )

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
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="inquiry">Inquiry</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="past_customer">Past Customer</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <LocationFilter value={locationId} onChange={(v) => { setLocationId(v); setPage(1) }} />
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
        </div>
      )}

      {/* Total count */}
      {stats && (
        <div className="text-sm text-muted-foreground">
          {stats.total} total contacts
          {hasFilters && ` · ${customers.length} matching`}
        </div>
      )}

      {/* Bulk actions toolbar */}
      {selectedCustomers.length > 0 && (
        <BulkActionsToolbar
          selectedCustomers={selectedCustomers}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      {/* Table */}
      <Card className="border-0 shadow-none md:border md:shadow-sm">
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
              {/* Mobile card list (under md) */}
              <div className="md:hidden p-3 space-y-2">
                {customers.map((customer: Customer & { open_jobs_count?: number }) => {
                  const displayName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.name
                  const statusColor = STATUS_COLORS[customer.status] || ''
                  const openJobCount = (customer as Record<string, unknown>).open_jobs_count as number || 0
                  const phone = customer.mobile_phone || customer.office_phone || customer.phone
                  return (
                    <MobileListCard
                      key={customer.id}
                      href={`/crm/contacts/${customer.id}`}
                      identifier={
                        <span className="flex items-center gap-1.5">
                          {displayName}
                          {openJobCount > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                              {openJobCount} active
                            </span>
                          )}
                        </span>
                      }
                      badge={
                        <Badge className={`text-xs border-0 ${statusColor}`}>
                          {customer.status === 'past_customer' ? 'Past' : customer.status}
                        </Badge>
                      }
                      title={customer.company_name || undefined}
                      subtitle={customer.title || undefined}
                      meta={
                        <>
                          {customer.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[180px]">{customer.email}</span>
                            </span>
                          )}
                          {phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {phone}
                            </span>
                          )}
                          <span className="capitalize">{customer.contact_type}</span>
                          {(customer.lifetime_value ?? 0) > 0 && (
                            <span className="font-medium text-foreground">
                              ${(customer.lifetime_value ?? 0).toLocaleString()}
                            </span>
                          )}
                          {(customer.total_jobs ?? 0) > 0 && (
                            <span>{customer.total_jobs} job{(customer.total_jobs ?? 0) !== 1 ? 's' : ''}</span>
                          )}
                        </>
                      }
                    />
                  )
                })}
              </div>

              {/* Desktop table (md and up) */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all contacts"
                      />
                    </TableHead>
                    <SortableHead column="first_name" label="Name" />
                    <SortableHead column="company_name" label="Company" />
                    <TableHead>Contact</TableHead>
                    <SortableHead column="contact_type" label="Type" />
                    <SortableHead column="status" label="Status" />
                    <SortableHead column="lifetime_value" label="Value" />
                    <SortableHead column="total_jobs" label="Jobs" />
                    <SortableHead column="last_job_date" label="Last Job" />
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer: Customer & { open_jobs_count?: number }) => {
                    const displayName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.name
                    const statusColor = STATUS_COLORS[customer.status] || ''
                    const contactStatusColor = customer.contact_status ? CONTACT_STATUS_COLORS[customer.contact_status] || '' : ''
                    const openJobCount = (customer as Record<string, unknown>).open_jobs_count as number || 0

                    return (
                      <TableRow key={customer.id} className="group" data-state={selectedIds.has(customer.id) ? 'selected' : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(customer.id)}
                            onCheckedChange={() => toggleRowSelected(customer.id)}
                            aria-label={`Select ${displayName}`}
                          />
                        </TableCell>
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
                              {customer.status === 'past_customer' ? 'Past Customer' : customer.status}
                            </Badge>
                            {customer.contact_status && customer.contact_status !== 'active' && (
                              <Badge className={`text-xs border-0 block w-fit ${contactStatusColor}`}>
                                {customer.contact_status.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums">
                          {(customer.lifetime_value ?? 0) > 0 ? (
                            <span className="font-medium">${(customer.lifetime_value ?? 0).toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-center tabular-nums">
                          {(customer.total_jobs ?? 0) > 0 ? customer.total_jobs : <span className="text-muted-foreground">—</span>}
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
