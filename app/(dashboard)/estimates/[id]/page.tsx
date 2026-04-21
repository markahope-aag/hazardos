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
  Phone,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

interface ApprovalRequestState {
  id: string
  requested_by: string
  level1_status: 'pending' | 'approved' | 'rejected'
  level1_notes: string | null
  level1_at: string | null
  requires_level2: boolean
  level2_status: 'pending' | 'approved' | 'rejected' | null
  level2_notes: string | null
  level2_at: string | null
  final_status: 'pending' | 'approved' | 'rejected'
}

export default function EstimateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { profile } = useMultiTenantAuth()
  const [estimate, setEstimate] = useState<EstimateWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequestState | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const [verbalDialogOpen, setVerbalDialogOpen] = useState(false)
  const [verbalSignerName, setVerbalSignerName] = useState('')
  const [verbalNote, setVerbalNote] = useState('')
  const [verbalApprovedAt, setVerbalApprovedAt] = useState('')

  const estimateId = params.id as string

  const loadEstimate = useCallback(async () => {
    if (!estimateId) return

    try {
      setLoading(true)
      const [estRes, approvalRes] = await Promise.all([
        fetch(`/api/estimates/${estimateId}`),
        fetch(`/api/estimates/${estimateId}/approval`),
      ])
      if (!estRes.ok) {
        if (estRes.status === 404) {
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

      const data = await estRes.json()
      setEstimate(data.estimate)

      if (approvalRes.ok) {
        const approvalData = await approvalRes.json()
        setApprovalRequest(approvalData.approval_request)
      }
    } catch {
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

  const handleSubmitForApproval = async () => {
    setActionPending(true)
    try {
      const response = await fetch(`/api/estimates/${estimateId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!response.ok) throw new Error('Failed to submit estimate')

      toast({
        title: 'Submitted for review',
        description: 'The office manager has been notified.',
      })
      loadEstimate()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to submit estimate.',
        variant: 'destructive',
      })
    } finally {
      setActionPending(false)
    }
  }

  const handleReview = async (approved: boolean, notes?: string) => {
    setActionPending(true)
    try {
      const response = await fetch(`/api/estimates/${estimateId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, notes: notes || undefined }),
      })
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody?.error?.message || 'Failed to record decision')
      }

      const result = await response.json()
      if (!approved) {
        toast({
          title: 'Sent back for changes',
          description: 'The originator has been notified.',
        })
      } else if (result.finalized) {
        toast({
          title: 'Approved',
          description: 'Estimate is being sent to the customer.',
        })
      } else {
        toast({
          title: 'Forwarded for final approval',
          description: 'The company owner has been notified.',
        })
      }
      setShowRejectForm(false)
      setRejectNotes('')
      loadEstimate()
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to record decision.',
        variant: 'destructive',
      })
    } finally {
      setActionPending(false)
    }
  }

  const openVerbalApprovalDialog = () => {
    // Pre-fill signer with a sensible guess from the customer record so
    // the admin doesn't retype it for a call they just took.
    const c = estimate?.customer
    const presetName =
      c?.company_name ||
      [c?.first_name, c?.last_name].filter(Boolean).join(' ').trim() ||
      c?.name ||
      ''
    setVerbalSignerName(presetName)
    setVerbalNote('')
    setVerbalApprovedAt('')
    setVerbalDialogOpen(true)
  }

  const handleRecordVerbalApproval = async () => {
    if (!pendingProposalId) return
    if (!verbalSignerName.trim() || !verbalNote.trim()) {
      toast({
        title: 'Missing info',
        description: 'Signer name and a note describing the call are required.',
        variant: 'destructive',
      })
      return
    }

    setActionPending(true)
    try {
      const response = await fetch(
        `/api/proposals/${pendingProposalId}/record-verbal-approval`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signer_name: verbalSignerName.trim(),
            note: verbalNote.trim(),
            approved_at: verbalApprovedAt
              ? new Date(verbalApprovedAt).toISOString()
              : undefined,
          }),
        },
      )

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(
          errBody?.error?.message || 'Failed to record verbal approval.',
        )
      }

      toast({
        title: 'Verbal approval recorded',
        description: 'The estimate has been marked as accepted.',
      })
      setVerbalDialogOpen(false)
      loadEstimate()
    } catch (e) {
      toast({
        title: 'Error',
        description:
          e instanceof Error ? e.message : 'Failed to record verbal approval.',
        variant: 'destructive',
      })
    } finally {
      setActionPending(false)
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
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete estimate.',
        variant: 'destructive',
      })
    }
  }

  const role = profile?.role
  const isOwnerLike = role === 'tenant_owner' || role === 'platform_owner' || role === 'platform_admin'
  const isAdminLike = isOwnerLike || role === 'admin'

  // L1 (office manager) reviews first; L2 (owner) gives final approval.
  const awaitingLevel: 1 | 2 | null = approvalRequest && approvalRequest.final_status === 'pending'
    ? approvalRequest.level1_status === 'pending'
      ? 1
      : approvalRequest.requires_level2 && approvalRequest.level2_status === 'pending'
        ? 2
        : null
    : null
  const canReviewNow =
    awaitingLevel === 1 ? isAdminLike : awaitingLevel === 2 ? isOwnerLike : false

  const canEdit = estimate?.status === 'draft' || estimate?.status === 'pending_approval'

  // "Record verbal approval" only makes sense when a proposal has been
  // sent to the customer but they haven't signed yet. Pick the most
  // recent sent/viewed proposal — in practice there's one at a time.
  const pendingProposalId = (() => {
    const pending = estimate?.proposals?.find(
      (p) => p.status === 'sent' || p.status === 'viewed',
    )
    return pending?.id ?? null
  })()
  const canRecordVerbalApproval = isAdminLike && !!pendingProposalId

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

  const customerName = (() => {
    const c = estimate.customer
    if (!c) return 'No customer assigned'
    if (c.company_name) return c.company_name
    // first_name / last_name are both nullable on customers, so blindly
    // interpolating renders "undefined undefined" for contacts that only
    // have the computed `name` field populated. Compose from whatever's
    // present; fall through to `name` or a neutral placeholder.
    const full = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
    return full || c.name || 'Unnamed customer'
  })()

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
            <Button onClick={handleSubmitForApproval} disabled={actionPending}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
          {estimate.status === 'pending_approval' && canReviewNow && (
            <>
              <Button onClick={() => handleReview(true)} disabled={actionPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {awaitingLevel === 2 ? 'Give Final Approval' : 'Approve & Forward'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                disabled={actionPending}
              >
                Send Back for Changes
              </Button>
            </>
          )}
          {estimate.status === 'approved' && (
            <Button asChild>
              <Link href={`/proposals/new?estimate=${estimate.id}`}>
                <FileText className="h-4 w-4 mr-2" />
                Create Proposal
              </Link>
            </Button>
          )}
          {canRecordVerbalApproval && (
            <Button
              variant="outline"
              onClick={openVerbalApprovalDialog}
              disabled={actionPending}
            >
              <Phone className="h-4 w-4 mr-2" />
              Record Verbal Approval
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

      {approvalRequest && approvalRequest.final_status === 'pending' && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {awaitingLevel === 1 && (
            <>Awaiting office manager review. Once reviewed, it will be forwarded to the owner for final approval.</>
          )}
          {awaitingLevel === 2 && (
            <>Office manager approved — waiting on final approval from the owner.</>
          )}
        </div>
      )}

      {estimate.approval_notes && estimate.status === 'draft' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold mb-1">Reviewer sent this back for changes:</div>
          <div className="whitespace-pre-wrap">{estimate.approval_notes}</div>
        </div>
      )}

      {showRejectForm && (
        <div className="rounded-md border border-gray-200 bg-white p-4 space-y-3">
          <div className="text-sm font-medium text-gray-800">Send back for changes</div>
          <textarea
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm min-h-[80px]"
            placeholder="What needs to change? (this goes to the surveyor)"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowRejectForm(false)
                setRejectNotes('')
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReview(false, rejectNotes.trim() || undefined)}
              disabled={actionPending}
            >
              Send Back
            </Button>
          </div>
        </div>
      )}

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
            {!estimate.estimated_duration_days &&
              !estimate.estimated_start_date &&
              !estimate.valid_until && (
                <p className="text-sm text-muted-foreground">
                  No timeline set.{' '}
                  {canEdit && (
                    <Link
                      href={`/estimates/${estimate.id}/edit`}
                      className="underline hover:text-foreground"
                    >
                      Add duration, start date, or expiry
                    </Link>
                  )}
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

      <Dialog open={verbalDialogOpen} onOpenChange={setVerbalDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record verbal approval</DialogTitle>
            <DialogDescription>
              Use this when the customer calls or confirms in person instead
              of signing the emailed proposal. The estimate will move to
              accepted, and the note below is kept as the audit record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="verbal-signer">Who approved it?</Label>
              <Input
                id="verbal-signer"
                value={verbalSignerName}
                onChange={(e) => setVerbalSignerName(e.target.value)}
                placeholder="Customer or authorized contact"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="verbal-note">Approval note *</Label>
              <Textarea
                id="verbal-note"
                value={verbalNote}
                onChange={(e) => setVerbalNote(e.target.value)}
                placeholder="e.g. John called at 2:15pm and confirmed he's good to proceed. Said he's already emailed his insurance company."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Required. Captures the who/when/what for this approval.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verbal-date">
                Approval date/time{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="verbal-date"
                type="datetime-local"
                value={verbalApprovedAt}
                onChange={(e) => setVerbalApprovedAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use now. Set a past time if you're recording
                after the fact.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVerbalDialogOpen(false)}
              disabled={actionPending}
            >
              Cancel
            </Button>
            <Button onClick={handleRecordVerbalApproval} disabled={actionPending}>
              {actionPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Record approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
