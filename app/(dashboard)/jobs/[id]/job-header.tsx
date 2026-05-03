'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  ArrowLeft,
  MoreHorizontal,
  Play,
  CheckCircle,
  FileText,
  XCircle,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Job } from '@/types/jobs'
import { jobStatusConfig } from '@/types/jobs'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'

interface JobHeaderProps {
  job: Job
}

export function JobHeader({ job }: JobHeaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  // Confirm-before-transition dialogs — these status moves are a pain
  // to undo (reminders cancel, calendar events update, completion
  // workflows kick off) so a quick "are you sure" is cheaper than the
  // ad-hoc rollback work users did when they mis-clicked.
  const [showStartDialog, setShowStartDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [generatingWorkOrder, setGeneratingWorkOrder] = useState(false)

  const generateWorkOrder = async () => {
    setGeneratingWorkOrder(true)
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
      if (!res.ok) {
        // API error envelope is { error: "string", type: "...", field?: "..." } —
        // previous code read body.error.message (treating error as an
        // object), which was always undefined, so every failure showed
        // the generic fallback instead of the real reason.
        const body = await res.json().catch(() => ({}))
        const reason =
          typeof body?.error === 'string'
            ? body.error
            : typeof body?.error?.message === 'string'
            ? body.error.message
            : null
        throw new Error(reason || `Failed to generate work order (${res.status})`)
      }
      const body = await res.json()
      toast({
        title: 'Work order generated',
        description: `${body.work_order.work_order_number} created as draft.`,
      })
      router.push(`/work-orders/${body.work_order.id}`)
    } catch (err) {
      toast({
        title: 'Could not generate work order',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingWorkOrder(false)
    }
  }

  const updateStatus = async (status: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      toast({
        title: 'Status updated',
        description: `Job status changed to ${jobStatusConfig[status as keyof typeof jobStatusConfig]?.label || status}`,
      })

      router.refresh()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update job status',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const cancelJob = async () => {
    await updateStatus('cancelled')
    setShowCancelDialog(false)
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild aria-label="Back to jobs">
              <Link href="/jobs">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{job.job_number}</h1>
            <Badge className={cn(jobStatusConfig[job.status]?.bgColor, jobStatusConfig[job.status]?.color)}>
              {jobStatusConfig[job.status]?.label || job.status}
            </Badge>
          </div>
          {job.name && <p className="text-muted-foreground ml-10">{job.name}</p>}
          <div className="text-sm text-muted-foreground ml-10">
            Scheduled: {format(parseISO(job.scheduled_start_date), 'MMMM d, yyyy')}
            {job.scheduled_start_time && <> at {format(parseISO(`2000-01-01T${job.scheduled_start_time}`), 'h:mm a')}</>}
          </div>
        </div>

        <div className="flex gap-2">
          {job.status === 'scheduled' && (
            <Button onClick={() => setShowStartDialog(true)} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              Start Job
            </Button>
          )}
          {job.status === 'in_progress' && (
            <Button onClick={() => setShowCompleteDialog(true)} disabled={loading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Job
            </Button>
          )}
          {job.status === 'completed' && (
            <Button asChild>
              <Link href={`/invoices/new?job_id=${job.id}`}>
                <FileText className="h-4 w-4 mr-2" />
                Create Invoice
              </Link>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={generateWorkOrder}
            disabled={generatingWorkOrder}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            {generatingWorkOrder ? 'Generating...' : 'Generate Work Order'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More job actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/jobs/${job.id}/edit`}>Edit Job</Link>
              </DropdownMenuItem>
              {job.proposal && (
                <DropdownMenuItem asChild>
                  <Link href={`/proposals/${job.proposal.id}`}>View Proposal</Link>
                </DropdownMenuItem>
              )}
              {job.estimate && (
                <DropdownMenuItem asChild>
                  <Link href={`/estimates/${job.estimate.id}`}>View Estimate</Link>
                </DropdownMenuItem>
              )}
              {job.site_survey && (
                <DropdownMenuItem asChild>
                  <Link href={`/surveys/${job.site_survey.id}`}>View Survey</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {job.status !== 'cancelled' && job.status !== 'closed' && (
                <DropdownMenuItem className="text-destructive" onClick={() => setShowCancelDialog(true)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Job
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Job?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this job? This action can be undone by changing the status back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Job</AlertDialogCancel>
            <AlertDialogAction onClick={cancelJob} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start this job now?</AlertDialogTitle>
            <AlertDialogDescription>
              Marks the job as in-progress. Pending reminders stop, the calendar
              event updates, and the crew can begin logging time. You can still
              move it back to Scheduled from the status dropdown if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowStartDialog(false)
                updateStatus('in_progress')
              }}
            >
              Start Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this job complete?</AlertDialogTitle>
            <AlertDialogDescription>
              This closes out the job and unlocks invoice creation. If the crew
              is still on site, hold off until they&apos;re done — reopening a
              completed job is possible but kicks off a few downstream
              resets (reminders, calendar, workflow triggers).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCompleteDialog(false)
                updateStatus('completed')
              }}
            >
              Complete Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
