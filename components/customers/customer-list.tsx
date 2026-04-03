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
import { Users, ChevronLeft, ChevronRight, Search, Phone, Mail } from 'lucide-react'
import { useCustomers } from '@/lib/hooks/use-customers'
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

export default function CustomerList({ onEditCustomer, onDeleteCustomer }: CustomerListProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CustomerStatus | 'all'>('all')
  const [contactType, setContactType] = useState<ContactType | 'all'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 25

  const debouncedSearch = useDebouncedValue(search, 300)

  const queryOptions = useMemo(() => ({
    search: debouncedSearch,
    status,
    contactType,
    page,
    pageSize,
  }), [debouncedSearch, status, contactType, page, pageSize])

  const { data: customers = [], isLoading, error } = useCustomers(queryOptions)

  const handleClearFilters = useCallback(() => {
    setStatus('all')
    setContactType('all')
    setSearch('')
    setPage(1)
  }, [])

  const hasNextPage = customers.length === pageSize
  const hasPrevPage = page > 1
  const hasFilters = status !== 'all' || contactType !== 'all' || search !== ''

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
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Contacted</TableHead>
                    <TableHead>Next Follow-up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer: Customer) => {
                    const displayName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.name
                    const statusColor = STATUS_COLORS[customer.status] || ''
                    const contactStatusColor = CONTACT_STATUS_COLORS[customer.contact_status] || ''

                    return (
                      <TableRow key={customer.id} className="group">
                        <TableCell>
                          <div>
                            <Link href={`/crm/contacts/${customer.id}`} className="font-medium text-primary hover:underline">
                              {displayName}
                            </Link>
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
                        <TableCell className="text-sm text-muted-foreground">
                          {customer.last_contacted_date
                            ? new Date(customer.last_contacted_date).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {customer.next_followup_date ? (
                            <div>
                              <div className={new Date(customer.next_followup_date) < new Date() ? 'text-destructive font-medium' : ''}>
                                {new Date(customer.next_followup_date).toLocaleDateString()}
                              </div>
                              {customer.next_followup_note && (
                                <div className="text-xs text-muted-foreground truncate max-w-[120px]">{customer.next_followup_note}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
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
