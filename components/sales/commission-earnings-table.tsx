'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, X, Wallet, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import type { CommissionEarning, CommissionStatus } from '@/types/sales'

function StatusBadge({ status }: { status: CommissionStatus }) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>
    case 'approved':
      return <Badge variant="default">Approved</Badge>
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>
    case 'paid':
      return <Badge className="bg-green-500 text-white">Paid</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

interface CommissionEarningsTableProps {
  earnings: CommissionEarning[]
  canManage: boolean
}

type Action = 'approve' | 'reject' | 'mark_paid'

export function CommissionEarningsTable({ earnings, canManage }: CommissionEarningsTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<CommissionEarning | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const runAction = async (id: string, action: Action, reason?: string) => {
    setBusyId(id)
    try {
      const response = await fetch(`/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reason ? { action, reason } : { action }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const detail =
          typeof data?.error === 'string'
            ? data.error
            : typeof data?.error?.message === 'string'
              ? data.error.message
              : null
        throw new Error(detail || `Action failed (${response.status})`)
      }

      const labels: Record<Action, string> = {
        approve: 'Commission approved',
        reject: 'Commission rejected',
        mark_paid: 'Commission marked paid',
      }
      toast({ title: labels[action] })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Action failed',
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    const target = rejectTarget
    setRejectTarget(null)
    await runAction(target.id, 'reject', rejectReason.trim() || undefined)
    setRejectReason('')
  }

  if (earnings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No commission earnings yet
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Sales Rep</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead className="text-right">Base Amount</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead>Status</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {earnings.map((earning) => {
            const busy = busyId === earning.id
            return (
              <TableRow key={earning.id}>
                <TableCell>{new Date(earning.earning_date).toLocaleDateString()}</TableCell>
                <TableCell>{earning.user?.full_name || 'Unknown'}</TableCell>
                <TableCell>{earning.plan?.name || '-'}</TableCell>
                <TableCell className="text-right">{formatCurrency(earning.base_amount, false)}</TableCell>
                <TableCell className="text-right">{earning.commission_rate}%</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(earning.commission_amount, false)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={earning.status} />
                  {earning.status === 'rejected' && earning.rejection_reason && (
                    <p className="text-xs text-muted-foreground mt-1">{earning.rejection_reason}</p>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {earning.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => runAction(earning.id, 'approve')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => {
                              setRejectReason('')
                              setRejectTarget(earning)
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {earning.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => runAction(earning.id, 'mark_paid')}
                        >
                          <Wallet className="h-4 w-4 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Commission</DialogTitle>
            <DialogDescription>
              Optionally record why this commission is being rejected. The sales rep will see this
              reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Reject Commission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
