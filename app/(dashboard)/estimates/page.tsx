'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Briefcase,
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

function getNextAction(estimate: EstimateWithRelations): { text: string; className: string } {
  const sentAt = estimate.proposals?.find(p => p.sent_at)?.sent_at
  switch (estimate.status) {
    case 'draft':
      return { text: 'Send to customer', className: 'text-muted-foreground' }
    case 'pending_approval':
      return { text: 'Awaiting approval', className: 'text-yellow-600' }
    case 'approved':
      return { text: 'Send to customer', className: 'text-blue-600' }
    case 'sent': {
      if (sentAt) {
        const daysSince = Math.floor(
          (Date.now() - new Date(sentAt).getTime()) / (1000 * 60 * 60 * 24)
        )
        return {
          text: `Awaiting response (${daysSince}d)`,
          className: daysSince > 14 ? 'text-amber-600 font-medium' : 'text-muted-foreground',
        }
      }
      return { text: 'Awaiting response', className: 'text-muted-foreground' }
    }
    case 'accepted':
      return { text: 'Create job', className: 'text-green-600 font-medium' }
    case 'rejected':
      return { text: 'Follow up', className: 'text-red-600' }
    case 'expired':
      return { text: 'Resend or close', className: 'text-gray-500' }
    case 'converted':
      return { text: 'Converted', className: 'text-emerald-600' }
    default:
      return { text: '', className: '' }
  }
}

function daysSinceOrUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export default function EstimatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()
  const [estimates, setEstimates] = useState<EstimateWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

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

  const filteredEstimates = useMemo(() => {
    return estimates.filter(estimate => {
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
  }, [estimates, searchQuery])

  const stats = useMemo(() => {
    const total = estimates.length
    const sentEstimates = estimates.filter(e =>
      ['sent', 'accepted', 'rejected', 'expired', 'converted'].includes(e.status)
    )
    const sentCount = sentEstimates.length
    const withJobs = estimates.filter(e =>
      (e.jobs?.length ?? 0) > 0 &&
      !e.jobs?.every(j => j.status === 'cancelled')
    ).length
    const winRate = sentCount > 0 ? Math.round((withJobs / sentCount) * 100) : 0

    const today = new Date().toISOString().split('T')[0]
    const overdue = estimates.filter(e =>
      e.status === 'sent' && e.valid_until && e.valid_until < today
    ).length

    const estimatesWithValue = estimates.filter(e => e.total > 0)
    const avgValue = estimatesWithValue.length > 0
      ? estimatesWithValue.reduce((sum, e) => sum + e.total, 0) / estimatesWithValue.length
      : 0

    const totalValue = estimates.reduce((sum, e) => sum + (e.total || 0), 0)
    const draft = estimates.filter(e => e.status === 'draft').length

    return { total, draft, winRate, overdue, avgValue, totalValue }
  }, [estimates])

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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Estimates</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.draft} drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate}%</div>
            <p className="text-xs text-muted-foreground">of sent estimates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-amber-600' : ''}`}>
              {stats.overdue}
            </div>
            <p className="text-xs text-muted-foreground">past expiration</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgValue)}</div>
            <p className="text-xs text-muted-foreground">per estimate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">all estimates</p>
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
            <SelectItem value="expired">Expired</SelectItem>
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
              <TableHead>Hazard</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Linked Job</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  Loading estimates...
                </TableCell>
              </TableRow>
            ) : filteredEstimates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
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
                    [estimate.customer.first_name, estimate.customer.last_name].filter(Boolean).join(' ') ||
                    estimate.customer.name ||
                    'No name'
                  : 'No customer'

                const sentAt = estimate.proposals?.find(p => p.sent_at)?.sent_at ?? null
                const hazardType = estimate.site_survey?.hazard_type ?? null
                const validUntil = estimate.valid_until
                const today = new Date().toISOString().split('T')[0]
                const isExpiredButSent = estimate.status === 'sent' && validUntil && validUntil < today
                const nextAction = getNextAction(estimate)
                const linkedJob = (estimate.jobs && estimate.jobs.length > 0)
                  ? estimate.jobs[0]
                  : null

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
                    <TableCell>
                      <div className="max-w-[150px] truncate">{customerName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px] truncate">
                        {estimate.project_name || estimate.site_survey?.job_name || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {hazardType ? (
                        <Badge variant="outline" className="capitalize text-xs">
                          {hazardType}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <EstimateStatusBadge status={estimate.status} />
                        {nextAction.text && (
                          <div className={`text-xs ${nextAction.className}`}>
                            {nextAction.text}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(estimate.total)}
                    </TableCell>
                    <TableCell>
                      {sentAt
                        ? new Date(sentAt).toLocaleDateString()
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {validUntil ? (
                        <span className={isExpiredButSent ? 'text-amber-600 font-medium' : ''}>
                          {new Date(validUntil).toLocaleDateString()}
                          {isExpiredButSent && (
                            <span className="block text-xs text-amber-600">
                              Overdue {daysSinceOrUntil(validUntil)}d
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {linkedJob ? (
                        <Link
                          href={`/crm/jobs/${linkedJob.id}`}
                          className="text-primary hover:underline text-sm flex items-center gap-1"
                        >
                          <Briefcase className="h-3 w-3" />
                          {linkedJob.job_number}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
