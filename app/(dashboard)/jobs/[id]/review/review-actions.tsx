'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'

interface CompletionReviewActionsProps {
  jobId: string
}

export function CompletionReviewActions({ jobId }: CompletionReviewActionsProps) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    try {
      setApproving(true)
      setError(null)

      const res = await fetch(`/api/jobs/${jobId}/complete/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_notes: reviewNotes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to approve')
      }

      router.push(`/jobs/${jobId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve completion')
    } finally {
      setApproving(false)
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required')
      return
    }

    try {
      setRejecting(true)
      setError(null)

      const res = await fetch(`/api/jobs/${jobId}/complete/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejection_reason: rejectionReason,
          review_notes: reviewNotes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reject')
      }

      setShowRejectDialog(false)
      router.push(`/jobs/${jobId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject completion')
    } finally {
      setRejecting(false)
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle>Review Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div>
          <Label htmlFor="reviewNotes">Review Notes (Optional)</Label>
          <Textarea
            id="reviewNotes"
            placeholder="Add any notes about this review..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>

        <div className="flex gap-4">
          <Button
            variant="default"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={handleApprove}
            disabled={approving || rejecting}
          >
            {approving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </>
            )}
          </Button>

          <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={approving || rejecting}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Completion</DialogTitle>
                <DialogDescription>
                  Please provide a reason for rejecting this job completion.
                  The crew will need to address the issues and resubmit.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Explain why this completion is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1"
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectDialog(false)}
                  disabled={rejecting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejecting || !rejectionReason.trim()}
                >
                  {rejecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    'Confirm Rejection'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
