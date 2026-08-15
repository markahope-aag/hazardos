'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { FileEdit, Plus, Loader2, Check, X } from 'lucide-react'
import type { JobChangeOrder } from '@/types/jobs'

interface JobChangeOrdersProps {
  jobId: string
  changeOrders: JobChangeOrder[]
  /**
   * Called after a successful add/approve/reject instead of the default
   * router.refresh(). The main job page is a server component that
   * refetches on refresh; a client-only page driven by react-query (like
   * the CRM job page) needs to invalidate its own query instead, since
   * router.refresh() doesn't touch client-fetched state.
   */
  onSaved?: () => void
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-green-50 text-green-800 border-green-200',
  rejected: 'bg-red-50 text-red-800 border-red-200',
}

/**
 * Records a scope/price change on an in-progress job without touching the
 * original estimate. The original estimate stays frozen history — this is
 * what a job actually costs once work starts diverging from what was
 * priced.
 */
export function JobChangeOrders({ jobId, changeOrders, onSaved }: JobChangeOrdersProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')

  const resetForm = () => {
    setDescription('')
    setReason('')
    setAmount('')
  }

  const handleAdd = async () => {
    const parsedAmount = Number(amount)
    if (!description.trim()) {
      toast({ title: 'Error', description: 'Describe what changed.', variant: 'destructive' })
      return
    }
    if (!amount || Number.isNaN(parsedAmount)) {
      toast({ title: 'Error', description: 'Enter a dollar amount.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/change-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          reason: reason.trim() || undefined,
          amount: parsedAmount,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Failed to add change order')
      }
      toast({ title: 'Change order recorded', description: 'Pending approval before it affects the job total.' })
      resetForm()
      setOpen(false)
      if (onSaved) onSaved(); else router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add change order',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAction = async (changeOrderId: string, action: 'approve' | 'reject') => {
    setActioningId(changeOrderId)
    try {
      const res = await fetch(`/api/jobs/${jobId}/change-orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_order_id: changeOrderId, action }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Failed to ${action} change order`)
      }
      toast({ title: action === 'approve' ? 'Change order approved' : 'Change order rejected' })
      if (onSaved) onSaved(); else router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action} change order`,
        variant: 'destructive',
      })
    } finally {
      setActioningId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <FileEdit className="h-5 w-5" />
          Change Orders
        </CardTitle>
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm() }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Change Order
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record a Change Order</DialogTitle>
              <DialogDescription>
                For a scope or price change on this job that came up after the estimate was
                approved. The original estimate isn&apos;t touched — this adds (or subtracts) from
                the job&apos;s final amount once approved.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="co-description">What changed *</Label>
                <Textarea
                  id="co-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Additional 200 sqft of flooring found under existing carpet"
                  rows={3}
                  maxLength={1000}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-reason">Reason</Label>
                <Textarea
                  id="co-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why this wasn't in the original scope"
                  rows={2}
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-amount">Amount *</Label>
                <Input
                  id="co-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  A price decrease (e.g. removed scope) can be entered as a negative number.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Record Change Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {changeOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No change orders yet. Use this to record a scope or price change on the job
            without editing the original estimate.
          </p>
        ) : (
          <div className="space-y-3">
            {changeOrders.map((co) => (
              <div key={co.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{co.change_order_number}</span>
                      <Badge variant="outline" className={STATUS_STYLES[co.status]}>
                        {co.status}
                      </Badge>
                    </div>
                    <p className="text-sm">{co.description}</p>
                    {co.reason && (
                      <p className="text-xs text-muted-foreground">{co.reason}</p>
                    )}
                  </div>
                  <span className={`font-medium whitespace-nowrap ${co.amount < 0 ? 'text-red-600' : ''}`}>
                    {co.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(co.amount))}
                  </span>
                </div>
                {co.status === 'pending' && (
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actioningId === co.id}
                      onClick={() => handleAction(co.id, 'reject')}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={actioningId === co.id}
                      onClick={() => handleAction(co.id, 'approve')}
                    >
                      {actioningId === co.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5 mr-1" />
                      )}
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
