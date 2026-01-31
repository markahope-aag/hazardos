import { useState } from 'react'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, ChevronLeft, ChevronRight } from 'lucide-react'
import CustomerListItem from './CustomerListItem'
import CustomerSearch from './CustomerSearch'
import CustomerFilters from './CustomerFilters'
import { useCustomers } from '@/lib/hooks/use-customers'
import type { Customer, CustomerStatus, CustomerSource } from '@/types/database'

interface CustomerListProps {
  onEditCustomer: (customer: Customer) => void
  onDeleteCustomer: (customer: Customer) => void
}

export default function CustomerList({ onEditCustomer, onDeleteCustomer }: CustomerListProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CustomerStatus | 'all'>('all')
  const [source, setSource] = useState<CustomerSource | 'all'>('all')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)

  const { data: customers = [], isLoading, error } = useCustomers({
    search,
    status,
    source,
    page,
    pageSize
  })

  const handleClearFilters = () => {
    setStatus('all')
    setSource('all')
    setSearch('')
    setPage(1)
  }

  const handleNextPage = () => {
    setPage(prev => prev + 1)
  }

  const handlePrevPage = () => {
    setPage(prev => Math.max(1, prev - 1))
  }

  const hasNextPage = customers.length === pageSize
  const hasPrevPage = page > 1

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-600 mb-2">Error loading customers</div>
            <div className="text-sm text-gray-500">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CustomerSearch
          value={search}
          onChange={setSearch}
          placeholder="Search by name, company, email, or phone..."
          className="flex-1 max-w-md"
        />
        <CustomerFilters
          status={status}
          source={source}
          onStatusChange={setStatus}
          onSourceChange={setSource}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Customer Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customers
            {!isLoading && (
              <span className="text-sm font-normal text-gray-500">
                ({customers.length} {customers.length === pageSize ? 'of many' : 'total'})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
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
                {search || status !== 'all' || source !== 'all' 
                  ? 'No customers found' 
                  : 'No customers yet'
                }
              </h3>
              <p className="text-gray-500 mb-4">
                {search || status !== 'all' || source !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first customer'
                }
              </p>
              {(search || status !== 'all' || source !== 'all') && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
            {customers.map((customer: Customer) => (
              <CustomerListItem
                key={customer.id}
                customer={customer}
                onEdit={onEditCustomer}
                onDelete={onDeleteCustomer}
              />
            ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {(hasNextPage || hasPrevPage) && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-500">
                    Page {page} {hasNextPage && 'of many'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={!hasPrevPage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!hasNextPage}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
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