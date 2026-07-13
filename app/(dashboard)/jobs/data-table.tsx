'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Search, MapPin, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { Job } from '@/types/jobs'
import { jobStatusConfig } from '@/types/jobs'
import Link from 'next/link'
import { LocationFilter, type LocationFilterValue } from '@/components/locations/location-filter'
import { MobileListCard } from '@/components/ui/mobile-list-card'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'

// Memoized table row component
interface JobRowProps {
  job: Job
  onRowClick: (id: string) => void
}

const JobRow = memo(function JobRow({ job, onRowClick }: JobRowProps) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onRowClick(job.id)}
    >
      <TableCell className="font-medium">
        {job.job_number}
        {job.name && (
          <div className="text-sm text-muted-foreground">{job.name}</div>
        )}
      </TableCell>
      <TableCell>
        {job.customer?.company_name || job.customer?.name || '-'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span className="truncate max-w-[200px]">{job.job_address}</span>
        </div>
        {job.job_city && (
          <div className="text-sm text-muted-foreground">
            {job.job_city}, {job.job_state}
          </div>
        )}
      </TableCell>
      <TableCell>
        {format(parseISO(job.scheduled_start_date), 'MMM d, yyyy')}
        {job.scheduled_start_time && (
          <div className="text-sm text-muted-foreground">
            {format(parseISO(`2000-01-01T${job.scheduled_start_time}`), 'h:mm a')}
          </div>
        )}
      </TableCell>
      <TableCell>
        {job.crew && job.crew.length > 0 ? (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span>{job.crew.length}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {formatCurrency(job.final_amount || job.contract_amount)}
      </TableCell>
      <TableCell>
        <Badge
          className={cn(
            jobStatusConfig[job.status]?.bgColor,
            jobStatusConfig[job.status]?.color
          )}
        >
          {jobStatusConfig[job.status]?.label || job.status}
        </Badge>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" aria-label="Job actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/jobs/${job.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/jobs/${job.id}/edit`}>Edit Job</Link>
            </DropdownMenuItem>
            {job.status === 'scheduled' && (
              <DropdownMenuItem>Start Job</DropdownMenuItem>
            )}
            {job.status === 'in_progress' && (
              <DropdownMenuItem>Complete Job</DropdownMenuItem>
            )}
            {job.status === 'completed' && (
              <DropdownMenuItem>Create Invoice</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
})

interface JobsDataTableProps {
  data: Job[]
  total: number
  page: number
  pageSize: number
  filters: {
    q: string
    status: string
    location: string
  }
}

// X22: the list is paginated and filtered on the server. This component is now
// presentational — it renders the current page and drives filters/pagination
// through the URL (searchParams), so the server re-fetches the right slice
// instead of the client filtering the whole dataset in memory.
export function JobsDataTable({ data, total, page, pageSize, filters }: JobsDataTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(filters.q)
  const debouncedSearch = useDebouncedValue(search, 300)

  // Build a URL with the given param changes applied on top of the current
  // query string. Empty / "all" values are removed. Any change other than
  // paging resets to page 1 so the user isn't stranded on a now-empty page.
  const buildUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams?.toString() || '')
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '' || value === 'all') {
          sp.delete(key)
        } else {
          sp.set(key, value)
        }
      }
      const qs = sp.toString()
      return qs ? `${pathname}?${qs}` : pathname
    },
    [searchParams, pathname]
  )

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      router.push(buildUrl(updates))
    },
    [router, buildUrl]
  )

  // Push the debounced search term into the URL only when it diverges from the
  // server-provided value. After navigation filters.q catches up, so this
  // doesn't loop.
  useEffect(() => {
    if (debouncedSearch !== filters.q) {
      setParams({ q: debouncedSearch || null, page: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const handleRowClick = useCallback(
    (id: string) => {
      router.push(`/jobs/${id}`)
    },
    [router]
  )

  const hasPrev = page > 1
  const hasNext = page * pageSize < total
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastRow = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Search jobs by job number, name, address, or customer"
          />
        </div>
        <Select
          value={filters.status}
          onValueChange={(v) => setParams({ status: v === 'all' ? null : v, page: null })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="invoiced">Invoiced</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <LocationFilter
          value={filters.location as LocationFilterValue}
          onChange={(v) => setParams({ location: v === 'all' ? null : v, page: null })}
        />
      </div>

      {/* Mobile card list (under md) */}
      <div className="md:hidden space-y-2">
        {data.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No jobs found
          </div>
        ) : (
          data.map((job) => {
            const cityState = [job.job_city, job.job_state].filter(Boolean).join(', ')
            const cfg = jobStatusConfig[job.status]
            return (
              <MobileListCard
                key={job.id}
                href={`/jobs/${job.id}`}
                identifier={job.job_number}
                badge={
                  cfg ? (
                    <Badge className={cn(cfg.bgColor, cfg.color)}>
                      {cfg.label}
                    </Badge>
                  ) : (
                    <Badge>{job.status}</Badge>
                  )
                }
                title={job.name || job.customer?.company_name || job.customer?.name || undefined}
                subtitle={
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[job.job_address, cityState].filter(Boolean).join(' · ')}
                  </span>
                }
                meta={
                  <>
                    <span>{format(parseISO(job.scheduled_start_date), 'MMM d, yyyy')}</span>
                    {job.scheduled_start_time && (
                      <span>{format(parseISO(`2000-01-01T${job.scheduled_start_time}`), 'h:mm a')}</span>
                    )}
                    {job.crew && job.crew.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {job.crew.length}
                      </span>
                    )}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(job.final_amount || job.contract_amount)}
                    </span>
                  </>
                }
              />
            )
          })
        )}
      </div>

      {/* Desktop table (md and up) */}
      <div className="hidden md:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Crew</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              data.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  onRowClick={handleRowClick}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count + pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {total === 0 ? 'No jobs' : `Showing ${firstRow}–${lastRow} of ${total} jobs`}
        </div>
        {(hasPrev || hasNext) && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setParams({ page: String(page - 1) })}
              disabled={!hasPrev}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setParams({ page: String(page + 1) })}
              disabled={!hasNext}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
