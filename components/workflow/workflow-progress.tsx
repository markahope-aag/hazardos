'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight, ClipboardList, FileSearch, Calculator, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WorkflowProgressProps {
  customerId: string
  customerName: string
  surveyId?: string | null
  estimateId?: string | null
  jobId?: string | null
  compact?: boolean
}

type StageStatus = 'completed' | 'current' | 'upcoming'

interface Stage {
  name: string
  status: StageStatus
  href: string | null
  ctaLabel: string | null
  ctaHref: string | null
  icon: React.ComponentType<{ className?: string }>
}

function getStages(props: WorkflowProgressProps): Stage[] {
  const { customerId, surveyId, estimateId, jobId } = props

  const hasLead = true
  const hasSurvey = !!surveyId
  const hasEstimate = !!estimateId
  const hasJob = !!jobId

  const stages: Stage[] = [
    {
      name: 'Lead',
      status: 'completed',
      href: `/crm/contacts/${customerId}`,
      ctaLabel: null,
      ctaHref: null,
      icon: ClipboardList,
    },
    {
      name: 'Survey',
      status: hasSurvey ? 'completed' : hasLead ? 'current' : 'upcoming',
      href: hasSurvey ? `/site-surveys/${surveyId}` : null,
      ctaLabel: hasSurvey ? null : 'Schedule Survey',
      ctaHref: hasSurvey ? null : `/site-surveys/new?customer_id=${customerId}`,
      icon: FileSearch,
    },
    {
      name: 'Estimate',
      status: hasEstimate ? 'completed' : hasSurvey ? 'current' : 'upcoming',
      href: hasEstimate ? `/estimates/${estimateId}` : null,
      ctaLabel: hasEstimate ? null : hasSurvey ? 'Create Estimate' : null,
      ctaHref: hasEstimate ? null : hasSurvey ? `/estimates/new?survey_id=${surveyId}` : null,
      icon: Calculator,
    },
    {
      name: 'Job',
      status: hasJob ? 'completed' : hasEstimate ? 'current' : 'upcoming',
      href: hasJob ? `/crm/jobs/${jobId}` : null,
      ctaLabel: hasJob ? null : hasEstimate ? 'Schedule Job' : null,
      ctaHref: hasJob
        ? null
        : hasEstimate
          ? `/jobs/new?estimate_id=${estimateId}&customer_id=${customerId}`
          : null,
      icon: Briefcase,
    },
  ]

  return stages
}

function StageIcon({ status, className }: { status: StageStatus; className?: string }) {
  if (status === 'completed') {
    return <CheckCircle2 className={cn('h-5 w-5 text-green-600', className)} />
  }
  if (status === 'current') {
    return (
      <div className={cn('h-5 w-5 rounded-full border-2 border-blue-500 flex items-center justify-center', className)}>
        <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
      </div>
    )
  }
  return <Circle className={cn('h-5 w-5 text-muted-foreground/40', className)} />
}

export function WorkflowProgress(props: WorkflowProgressProps) {
  const stages = getStages(props)
  const { compact = false } = props

  return (
    <div className={cn(
      'rounded-lg border bg-card p-4',
      compact && 'p-3'
    )}>
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex items-center flex-1 last:flex-none">
            {/* Stage */}
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <StageIcon status={stage.status} />
                {stage.href ? (
                  <Link
                    href={stage.href}
                    className={cn(
                      'text-sm font-medium hover:underline',
                      stage.status === 'completed' && 'text-green-700',
                      stage.status === 'current' && 'text-blue-700',
                      stage.status === 'upcoming' && 'text-muted-foreground'
                    )}
                  >
                    {stage.name}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'text-sm font-medium',
                      stage.status === 'current' && 'text-blue-700',
                      stage.status === 'upcoming' && 'text-muted-foreground'
                    )}
                  >
                    {stage.name}
                  </span>
                )}
              </div>

              {/* CTA for current stage */}
              {stage.ctaLabel && stage.ctaHref && !compact && (
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                  <Link href={stage.ctaHref}>
                    {stage.ctaLabel}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}

              {/* Compact CTA */}
              {stage.ctaLabel && stage.ctaHref && compact && (
                <Link
                  href={stage.ctaHref}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  {stage.ctaLabel}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>

            {/* Connecting line */}
            {index < stages.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px mx-3',
                  stage.status === 'completed' ? 'bg-green-300' : 'bg-border'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
