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
}

export function SurveyActions({ survey }: SurveyActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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
      router.refresh()
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update status. Please try again.',
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
    } catch (error) {
      console.error('Error deleting survey:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete survey. Please try again.',
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
            <a href={`/site-surveys/${survey.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Survey
            </a>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Status transitions */}
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
                onClick={() => updateStatus('cancelled')}
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
