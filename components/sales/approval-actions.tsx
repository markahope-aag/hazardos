'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { ApprovalRequest } from '@/types/sales'

interface ApprovalActionsProps {
  request: ApprovalRequest
}

export function ApprovalActions({ request }: ApprovalActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')

  // Determine which level to act on
  const actingLevel = request.level1_status === 'pending' ? 1 :
                      (request.requires_level2 && request.level2_status === 'pending') ? 2 : null

  if (!actingLevel) {
    return <span className="text-muted-foreground text-sm">No action needed</span>
  }

  const handleApprove = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/approvals/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: actingLevel,
          approved: true,
        }),
      })

      if (!response.ok) throw new Error('Failed to approve')

      toast({
        title: 'Approved',
        description: `Level ${actingLevel} approval complete`,
      })

      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/approvals/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: actingLevel,
          approved: false,
          notes: rejectNotes,
        }),
      })

      if (!response.ok) throw new Error('Failed to reject')

      toast({
        title: 'Rejected',
        description: 'Request has been rejected',
      })

      setShowRejectDialog(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={handleApprove}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
          disabled={loading}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Rejection Reason</Label>
              <Textarea
                id="notes"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Enter the reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
