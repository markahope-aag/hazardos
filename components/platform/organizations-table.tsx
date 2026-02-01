'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import type { OrganizationSummary } from '@/types/platform-admin'

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Active', color: 'text-green-800', bgColor: 'bg-green-100' },
  trialing: { label: 'Trialing', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  past_due: { label: 'Past Due', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  canceled: { label: 'Canceled', color: 'text-gray-800', bgColor: 'bg-gray-100' },
  unpaid: { label: 'Unpaid', color: 'text-red-800', bgColor: 'bg-red-100' },
  none: { label: 'No Plan', color: 'text-gray-600', bgColor: 'bg-gray-50' },
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

interface OrganizationsTableProps {
  organizations: OrganizationSummary[]
  showPagination?: boolean
  totalPages?: number
  currentPage?: number
  onPageChange?: (page: number) => void
  onSearch?: (query: string) => void
  onStatusFilter?: (status: string) => void
}

export function OrganizationsTable({
  organizations,
  showPagination = false,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  onSearch,
  onStatusFilter,
}: OrganizationsTableProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = () => {
    onSearch?.(searchQuery)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {(onSearch || onStatusFilter) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {onSearch && (
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch}>Search</Button>
            </div>
          )}
          {onStatusFilter && (
            <Select onValueChange={onStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Jobs</TableHead>
              <TableHead className="text-right">MRR</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No organizations found
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((org) => {
                const status = statusConfig[org.subscriptionStatus] || statusConfig.none

                return (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        {org.trialEndsAt && org.subscriptionStatus === 'trialing' && (
                          <p className="text-xs text-muted-foreground">
                            Trial ends {format(new Date(org.trialEndsAt), 'MMM d')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.planName ? (
                        <Badge variant="outline">{org.planName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status.bgColor} ${status.color}`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{org.usersCount}</TableCell>
                    <TableCell className="text-right">{org.jobsThisMonth}</TableCell>
                    <TableCell className="text-right">
                      {org.mrr > 0 ? formatCurrency(org.mrr) : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(org.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/platform/organizations/${org.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
