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
            <Button variant="ghost" size="icon" asChild>
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
            <Button onClick={() => updateStatus('in_progress')} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              Start Job
            </Button>
          )}
          {job.status === 'in_progress' && (
            <Button onClick={() => updateStatus('completed')} disabled={loading}>
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
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
    </>
  )
}
