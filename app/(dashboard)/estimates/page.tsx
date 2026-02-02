'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calculator,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  FileEdit,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  DollarSign,
} from 'lucide-react'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { formatCurrency } from '@/lib/utils'
import type { EstimateWithRelations, EstimateStatus, ESTIMATE_STATUS_CONFIG } from '@/types/estimates'

const STATUS_CONFIG: typeof ESTIMATE_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100', description: '' },
  pending_approval: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100', description: '' },
  approved: { label: 'Approved', color: 'text-blue-700', bgColor: 'bg-blue-100', description: '' },
  sent: { label: 'Sent', color: 'text-purple-700', bgColor: 'bg-purple-100', description: '' },
  accepted: { label: 'Accepted', color: 'text-green-700', bgColor: 'bg-green-100', description: '' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100', description: '' },
  expired: { label: 'Expired', color: 'text-gray-500', bgColor: 'bg-gray-100', description: '' },
  converted: { label: 'Converted', color: 'text-emerald-700', bgColor: 'bg-emerald-100', description: '' },
}

function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={`${config.bgColor} ${config.color} border-0`}>
      {config.label}
    </Badge>
  )
}

export default function EstimatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()
  const [estimates, setEstimates] = useState<EstimateWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    totalValue: 0,
  })

  const loadEstimates = useCallback(async () => {
    if (!organization?.id) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/estimates?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch estimates')

      const data = await response.json()
      setEstimates(data.estimates || [])

      // Calculate stats
      const allEstimates = data.estimates || []
      setStats({
        total: allEstimates.length,
        draft: allEstimates.filter((e: EstimateWithRelations) => e.status === 'draft').length,
        pending: allEstimates.filter((e: EstimateWithRelations) => e.status === 'pending_approval').length,
        approved: allEstimates.filter((e: EstimateWithRelations) =>
          ['approved', 'sent', 'accepted', 'converted'].includes(e.status)
        ).length,
        totalValue: allEstimates.reduce((sum: number, e: EstimateWithRelations) => sum + (e.total || 0), 0),
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load estimates.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [organization?.id, statusFilter, toast])

  useEffect(() => {
    loadEstimates()
  }, [loadEstimates])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return

    try {
      const response = await fetch(`/api/estimates/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete estimate')

      toast({ title: 'Success', description: 'Estimate deleted.' })
      loadEstimates()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete estimate.',
        variant: 'destructive',
      })
    }
  }

  const filteredEstimates = estimates.filter(estimate => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      estimate.estimate_number?.toLowerCase().includes(query) ||
      estimate.project_name?.toLowerCase().includes(query) ||
      estimate.customer?.company_name?.toLowerCase().includes(query) ||
      estimate.customer?.first_name?.toLowerCase().includes(query) ||
      estimate.customer?.last_name?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Estimates</h1>
          <p className="text-muted-foreground">
            Manage cost estimates for site surveys
          </p>
        </div>
        <Button asChild>
          <Link href="/site-surveys?action=estimate">
            <Plus className="h-4 w-4 mr-2" />
            Create Estimate
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Estimates</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileEdit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search estimates..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search estimates by name, customer, or amount"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estimate #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading estimates...
                </TableCell>
              </TableRow>
            ) : filteredEstimates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">No estimates found</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link href="/site-surveys?action=estimate">Create your first estimate</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filteredEstimates.map(estimate => {
                const customerName = estimate.customer
                  ? estimate.customer.company_name ||
                    `${estimate.customer.first_name} ${estimate.customer.last_name}`
                  : 'No customer'

                return (
                  <TableRow key={estimate.id}>
                    <TableCell>
                      <Link
                        href={`/estimates/${estimate.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {estimate.estimate_number}
                      </Link>
                    </TableCell>
                    <TableCell>{customerName}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">
                        {estimate.project_name || estimate.site_survey?.job_name || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <EstimateStatusBadge status={estimate.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(estimate.total)}
                    </TableCell>
                    <TableCell>
                      {new Date(estimate.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Estimate actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/estimates/${estimate.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/estimates/${estimate.id}/edit`)}>
                            <FileEdit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {estimate.status === 'approved' && (
                            <DropdownMenuItem onClick={() => router.push(`/proposals/new?estimate=${estimate.id}`)}>
                              <Send className="h-4 w-4 mr-2" />
                              Create Proposal
                            </DropdownMenuItem>
                          )}
                          {estimate.status === 'draft' && (
                            <DropdownMenuItem onClick={() => router.push(`/estimates/${estimate.id}?action=approve`)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Submit for Approval
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(estimate.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
