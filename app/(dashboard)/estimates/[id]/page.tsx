'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Send,
  CheckCircle,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Building2,
  MapPin,
  Calendar,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { formatCurrency } from '@/lib/utils'
import type { EstimateWithRelations, EstimateStatus, LineItemType, EstimateLineItem } from '@/types/estimates'

const STATUS_CONFIG: Record<EstimateStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  pending_approval: { label: 'Pending Approval', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  approved: { label: 'Approved', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  sent: { label: 'Sent', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  accepted: { label: 'Accepted', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  expired: { label: 'Expired', color: 'text-gray-500', bgColor: 'bg-gray-100' },
  converted: { label: 'Converted', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
}

const LINE_ITEM_TYPE_LABELS: Record<LineItemType, string> = {
  labor: 'Labor',
  equipment: 'Equipment',
  material: 'Materials',
  disposal: 'Disposal',
  travel: 'Travel',
  permit: 'Permits',
  testing: 'Testing',
  other: 'Other',
}

function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={`${config.bgColor} ${config.color} border-0`}>
      {config.label}
    </Badge>
  )
}

export default function EstimateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { profile } = useMultiTenantAuth()
  const [estimate, setEstimate] = useState<EstimateWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  const estimateId = params.id as string

  const loadEstimate = useCallback(async () => {
    if (!estimateId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/estimates/${estimateId}`)
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: 'Not Found',
            description: 'Estimate not found.',
            variant: 'destructive',
          })
          router.push('/estimates')
          return
        }
        throw new Error('Failed to fetch estimate')
      }

      const data = await response.json()
      setEstimate(data.estimate)
    } catch (error) {
      console.error('Error loading estimate:', error)
      toast({
        title: 'Error',
        description: 'Failed to load estimate.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [estimateId, toast, router])

  useEffect(() => {
    loadEstimate()
  }, [loadEstimate])

  const handleApprove = async () => {
    try {
      const response = await fetch(`/api/estimates/${estimateId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) throw new Error('Failed to approve estimate')

      toast({ title: 'Success', description: 'Estimate approved.' })
      loadEstimate()
    } catch (error) {
      console.error('Error approving estimate:', error)
      toast({
        title: 'Error',
        description: 'Failed to approve estimate.',
        variant: 'destructive',
      })
    }
  }

  const handleSubmitForApproval = async () => {
    try {
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending_approval' }),
      })

      if (!response.ok) throw new Error('Failed to submit estimate')

      toast({ title: 'Success', description: 'Estimate submitted for approval.' })
      loadEstimate()
    } catch (error) {
      console.error('Error submitting estimate:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit estimate.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this estimate?')) return

    try {
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete estimate')

      toast({ title: 'Success', description: 'Estimate deleted.' })
      router.push('/estimates')
    } catch (error) {
      console.error('Error deleting estimate:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete estimate.',
        variant: 'destructive',
      })
    }
  }

  const canApprove = profile?.role && ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'].includes(profile.role)
  const canEdit = estimate?.status === 'draft' || estimate?.status === 'pending_approval'

  // Group line items by type
  const groupedLineItems = estimate?.line_items?.reduce((acc, item) => {
    const type = item.item_type
    if (!acc[type]) acc[type] = []
    acc[type].push(item)
    return acc
  }, {} as Record<LineItemType, EstimateLineItem[]>) || {}

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!estimate) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Estimate not found</h1>
        <p className="text-muted-foreground mb-4">
          The requested estimate could not be found.
        </p>
        <Link href="/estimates">
          <Button>Back to Estimates</Button>
        </Link>
      </div>
    )
  }

  const customerName = estimate.customer
    ? estimate.customer.company_name || `${estimate.customer.first_name} ${estimate.customer.last_name}`
    : 'No customer assigned'

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/estimates"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Estimates
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{estimate.estimate_number}</h1>
            <EstimateStatusBadge status={estimate.status} />
          </div>
          <p className="text-lg text-muted-foreground">
            {estimate.project_name || estimate.site_survey?.job_name || 'Untitled Project'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {estimate.status === 'draft' && (
            <Button onClick={handleSubmitForApproval}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
          {estimate.status === 'pending_approval' && canApprove && (
            <Button onClick={handleApprove}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}
          {estimate.status === 'approved' && (
            <Button asChild>
              <Link href={`/proposals/new?estimate=${estimate.id}`}>
                <FileText className="h-4 w-4 mr-2" />
                Create Proposal
              </Link>
            </Button>
          )}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/estimates/${estimate.id}/edit`)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/estimates/${estimate.id}/line-items`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Edit Line Items
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Estimate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{customerName}</p>
            {estimate.customer?.email && (
              <p className="text-sm text-muted-foreground">{estimate.customer.email}</p>
            )}
            {estimate.customer?.phone && (
              <p className="text-sm text-muted-foreground">{estimate.customer.phone}</p>
            )}
          </CardContent>
        </Card>

        {/* Site Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Site Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {estimate.site_survey && (
              <>
                <p className="text-sm">{estimate.site_survey.site_address}</p>
                <p className="text-sm text-muted-foreground">
                  {estimate.site_survey.site_city}, {estimate.site_survey.site_state} {estimate.site_survey.site_zip}
                </p>
                <Badge variant="secondary" className="mt-2">
                  {estimate.site_survey.hazard_type}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {estimate.estimated_duration_days && (
              <p className="text-sm">
                <span className="text-muted-foreground">Duration:</span>{' '}
                {estimate.estimated_duration_days} days
              </p>
            )}
            {estimate.estimated_start_date && (
              <p className="text-sm">
                <span className="text-muted-foreground">Start:</span>{' '}
                {new Date(estimate.estimated_start_date).toLocaleDateString()}
              </p>
            )}
            {estimate.valid_until && (
              <p className="text-sm">
                <span className="text-muted-foreground">Valid Until:</span>{' '}
                {new Date(estimate.valid_until).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scope of Work */}
      {estimate.scope_of_work && (
        <Card>
          <CardHeader>
            <CardTitle>Scope of Work</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{estimate.scope_of_work}</p>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/estimates/${estimate.id}/line-items`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Items
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {(Object.entries(groupedLineItems) as [LineItemType, EstimateLineItem[]][]).map(([type, items]) => (
            <div key={type}>
              <div className="px-6 py-2 bg-muted/50">
                <h4 className="font-medium text-sm">{LINE_ITEM_TYPE_LABELS[type]}</h4>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: EstimateLineItem) => (
                    <TableRow key={item.id} className={!item.is_included ? 'opacity-50' : ''}>
                      <TableCell>
                        <div>
                          {item.description}
                          {item.is_optional && (
                            <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
                          )}
                          {!item.is_included && (
                            <Badge variant="outline" className="ml-2 text-xs">Excluded</Badge>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total_price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(estimate.subtotal)}</span>
            </div>
            {estimate.markup_percent > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Markup ({estimate.markup_percent}%)</span>
                <span>{formatCurrency(estimate.markup_amount)}</span>
              </div>
            )}
            {estimate.discount_percent > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({estimate.discount_percent}%)</span>
                <span>-{formatCurrency(estimate.discount_amount)}</span>
              </div>
            )}
            {estimate.tax_percent > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({estimate.tax_percent}%)</span>
                <span>{formatCurrency(estimate.tax_amount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(estimate.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Info */}
      {estimate.approved_by && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Approval Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {estimate.approved_by_user && (
              <p className="text-sm">
                <span className="text-muted-foreground">Approved by:</span>{' '}
                {estimate.approved_by_user.first_name} {estimate.approved_by_user.last_name}
              </p>
            )}
            {estimate.approved_at && (
              <p className="text-sm">
                <span className="text-muted-foreground">Approved on:</span>{' '}
                {new Date(estimate.approved_at).toLocaleString()}
              </p>
            )}
            {estimate.approval_notes && (
              <p className="text-sm">
                <span className="text-muted-foreground">Notes:</span>{' '}
                {estimate.approval_notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Internal Notes */}
      {estimate.internal_notes && (
        <Card>
          <CardHeader>
            <CardTitle>Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{estimate.internal_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
