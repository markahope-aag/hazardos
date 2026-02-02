'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { MoreHorizontal, ArrowRight, Trophy, XCircle, Loader2, Trash } from 'lucide-react'
import { lossReasons } from '@/types/sales'
import type { Opportunity, PipelineStage } from '@/types/sales'

interface OpportunityActionsProps {
  opportunity: Opportunity
  stages: PipelineStage[]
}

export function OpportunityActions({ opportunity, stages }: OpportunityActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showLossDialog, setShowLossDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [selectedStageId, setSelectedStageId] = useState('')
  const [moveNotes, setMoveNotes] = useState('')
  const [lossReason, setLossReason] = useState('')
  const [lossNotes, setLossNotes] = useState('')
  const [competitor, setCompetitor] = useState('')

  const isOpen = !opportunity.outcome

  const handleMove = async () => {
    if (!selectedStageId) return
    setLoading(true)

    try {
      const response = await fetch(`/api/pipeline/${opportunity.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage_id: selectedStageId,
          notes: moveNotes || undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to move opportunity')

      toast({
        title: 'Opportunity moved',
        description: 'The opportunity has been updated',
      })

      setShowMoveDialog(false)
      router.refresh()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to move opportunity',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkWon = async () => {
    setLoading(true)

    try {
      // Find the "won" stage
      const wonStage = stages.find(s => s.stage_type === 'won')
      if (!wonStage) throw new Error('Won stage not configured')

      const response = await fetch(`/api/pipeline/${opportunity.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: wonStage.id }),
      })

      if (!response.ok) throw new Error('Failed to mark as won')

      toast({
        title: 'Congratulations!',
        description: 'The opportunity has been marked as won',
      })

      router.refresh()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to mark as won',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkLost = async () => {
    setLoading(true)

    try {
      // Find the "lost" stage
      const lostStage = stages.find(s => s.stage_type === 'lost')
      if (!lostStage) throw new Error('Lost stage not configured')

      // First update loss details
      await fetch(`/api/pipeline/${opportunity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loss_reason: lossReason || undefined,
          loss_notes: lossNotes || undefined,
          competitor: competitor || undefined,
        }),
      })

      // Then move to lost stage
      const response = await fetch(`/api/pipeline/${opportunity.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: lostStage.id }),
      })

      if (!response.ok) throw new Error('Failed to mark as lost')

      toast({
        title: 'Opportunity closed',
        description: 'The opportunity has been marked as lost',
      })

      setShowLossDialog(false)
      router.refresh()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to mark as lost',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/pipeline/${opportunity.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete opportunity')

      toast({
        title: 'Opportunity deleted',
        description: 'The opportunity has been removed',
      })

      router.push('/pipeline')
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete opportunity',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter out won/lost stages for regular moves
  const moveableStages = stages.filter(
    s => s.stage_type !== 'won' && s.stage_type !== 'lost'
  )

  return (
    <>
      <div className="flex items-center gap-2">
        {isOpen && (
          <>
            <Button onClick={() => setShowMoveDialog(true)} variant="outline">
              <ArrowRight className="h-4 w-4 mr-2" />
              Move Stage
            </Button>
            <Button onClick={handleMarkWon} disabled={loading}>
              <Trophy className="h-4 w-4 mr-2" />
              Mark Won
            </Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOpen && (
              <>
                <DropdownMenuItem onClick={() => setShowLossDialog(true)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark as Lost
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Move Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Stage</DialogTitle>
            <DialogDescription>
              Select the new stage for this opportunity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {moveableStages.map(stage => (
                    <SelectItem
                      key={stage.id}
                      value={stage.id}
                      disabled={stage.id === opportunity.stage_id}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={moveNotes}
                onChange={(e) => setMoveNotes(e.target.value)}
                placeholder="Add notes about this stage change..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={!selectedStageId || loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loss Dialog */}
      <Dialog open={showLossDialog} onOpenChange={setShowLossDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Lost</DialogTitle>
            <DialogDescription>
              Record why this opportunity was lost to improve future sales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Loss Reason</Label>
              <Select value={lossReason} onValueChange={setLossReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {lossReasons.map(reason => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Competitor (if applicable)</Label>
              <input
                type="text"
                value={competitor}
                onChange={(e) => setCompetitor(e.target.value)}
                placeholder="Enter competitor name"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={lossNotes}
                onChange={(e) => setLossNotes(e.target.value)}
                placeholder="Any additional details about why we lost..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLossDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleMarkLost} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Mark as Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Opportunity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this opportunity? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
