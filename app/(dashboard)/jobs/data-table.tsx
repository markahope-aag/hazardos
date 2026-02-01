'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
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
import { MoreHorizontal, Search, MapPin, Users } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { Job } from '@/types/jobs'
import { jobStatusConfig } from '@/types/jobs'
import Link from 'next/link'

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
            <Button variant="ghost" size="icon">
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
}

export function JobsDataTable({ data }: JobsDataTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Memoize filtered data
  const filteredData = useMemo(() => {
    return data.filter(job => {
      const matchesSearch = search === '' ||
        job.job_number.toLowerCase().includes(search.toLowerCase()) ||
        job.customer?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        job.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        job.job_address.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all' || job.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [data, search, statusFilter])

  const handleRowClick = useCallback((id: string) => {
    router.push(`/jobs/${id}`)
  }, [router])

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
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
      </div>

      {/* Table */}
      <div className="border rounded-lg">
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
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((job) => (
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

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredData.length} of {data.length} jobs
      </div>
    </div>
  )
}
