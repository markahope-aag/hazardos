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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import {
  MoreHorizontal,
  Edit,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { SiteSurvey } from '@/types/database'

interface SurveyActionsProps {
  survey: SiteSurvey
  onStatusChange?: () => void
}

export function SurveyActions({ survey, onStatusChange }: SurveyActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('site_surveys')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)

      if (error) throw error

      toast({
        title: 'Status updated',
        description: `Survey status changed to ${newStatus}.`,
      })
      if (onStatusChange) {
        onStatusChange()
      } else {
        router.refresh()
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update status. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = async () => {
    const reason = cancelReason.trim()
    if (!reason) {
      toast({
        title: 'Reason required',
        description: 'Tell us why this survey is being cancelled — it shows up in the audit trail.',
        variant: 'destructive',
      })
      return
    }

    setIsUpdating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('site_surveys')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)

      if (error) throw error

      toast({
        title: 'Survey cancelled',
        description: 'The reason has been recorded.',
      })
      setShowCancelDialog(false)
      setCancelReason('')
      if (onStatusChange) {
        onStatusChange()
      } else {
        router.refresh()
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to cancel survey.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    setIsUpdating(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('site_surveys').delete().eq('id', survey.id)

      if (error) throw error

      toast({
        title: 'Survey deleted',
        description: 'The survey has been deleted.',
      })
      router.push('/site-surveys')
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete survey. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
      setShowDeleteDialog(false)
    }
  }

  const canMarkReviewed = survey.status === 'submitted'
  const canCancel = !['cancelled', 'completed'].includes(survey.status)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isUpdating}>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Actions
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <a href={`/site-surveys/mobile?surveyId=${survey.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Survey
            </a>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {canMarkReviewed && (
            <DropdownMenuItem onClick={() => updateStatus('reviewed')}>
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Mark as Reviewed
            </DropdownMenuItem>
          )}

          {survey.status === 'draft' && (
            <DropdownMenuItem onClick={() => updateStatus('scheduled')}>
              <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
              Mark as Scheduled
            </DropdownMenuItem>
          )}

          {survey.status === 'reviewed' && (
            <DropdownMenuItem onClick={() => updateStatus('estimated')}>
              <CheckCircle className="h-4 w-4 mr-2 text-purple-600" />
              Mark as Estimated
            </DropdownMenuItem>
          )}

          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowCancelDialog(true)}
                className="text-orange-600"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Survey
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Survey
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancel-with-reason dialog */}
      <Dialog open={showCancelDialog} onOpenChange={(open) => {
        setShowCancelDialog(open)
        if (!open) setCancelReason('')
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this survey?</DialogTitle>
            <DialogDescription>
              Required: why is this being cancelled? The reason is recorded
              and shown on the survey going forward — useful for anyone
              auditing the pipeline later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason">Reason *</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer backed out, hazard out of scope, rescheduled indefinitely."
              rows={4}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isUpdating}
            >
              Keep open
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isUpdating || !cancelReason.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Cancel survey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Survey?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the survey
              and all associated data including photos and notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
