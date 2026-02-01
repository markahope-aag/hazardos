'use client'

import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, AlertCircle, XCircle, TrendingUp } from 'lucide-react'
import type { UsageWarning, UsageWarningLevel } from '@/types/feature-flags'
import { cn } from '@/lib/utils'

interface UsageWarningAlertProps {
  warning: UsageWarning
  showUpgradeButton?: boolean
  className?: string
}

const warningConfig: Record<UsageWarningLevel, {
  icon: typeof AlertTriangle
  variant: 'default' | 'destructive'
  bgColor: string
  borderColor: string
  textColor: string
}> = {
  none: {
    icon: TrendingUp,
    variant: 'default',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
  },
  warning: {
    icon: AlertTriangle,
    variant: 'default',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
  },
  critical: {
    icon: AlertCircle,
    variant: 'default',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
  },
  exceeded: {
    icon: XCircle,
    variant: 'destructive',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
  },
}

const typeLabels = {
  users: 'User Limit',
  jobs: 'Monthly Job Limit',
  storage: 'Storage Limit',
}

/**
 * Display a usage warning alert
 */
export function UsageWarningAlert({
  warning,
  showUpgradeButton = true,
  className,
}: UsageWarningAlertProps) {
  const config = warningConfig[warning.level]
  const Icon = config.icon

  return (
    <Alert
      className={cn(
        config.bgColor,
        config.borderColor,
        'border',
        className
      )}
    >
      <Icon className={cn('h-4 w-4', config.textColor)} />
      <AlertTitle className={config.textColor}>
        {typeLabels[warning.type]} {warning.level === 'exceeded' ? 'Exceeded' : 'Warning'}
      </AlertTitle>
      <AlertDescription className={config.textColor}>
        <p className="mb-2">{warning.message}</p>
        <div className="flex items-center gap-4">
          <Progress
            value={Math.min(warning.percentage, 100)}
            className="flex-1 h-2"
          />
          <span className="text-sm font-medium">
            {Math.round(warning.percentage)}%
          </span>
        </div>
        {showUpgradeButton && warning.level !== 'none' && (
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link href="/settings/billing">Upgrade Plan</Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

interface UsageWarningBannerProps {
  warnings: UsageWarning[]
  className?: string
}

/**
 * Display a banner with the most severe usage warning
 */
export function UsageWarningBanner({ warnings, className }: UsageWarningBannerProps) {
  if (warnings.length === 0) return null

  // Sort by severity and show the most severe
  const severityOrder: UsageWarningLevel[] = ['exceeded', 'critical', 'warning', 'none']
  const sortedWarnings = [...warnings].sort(
    (a, b) => severityOrder.indexOf(a.level) - severityOrder.indexOf(b.level)
  )

  const mostSevere = sortedWarnings[0]
  const config = warningConfig[mostSevere.level]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3 rounded-lg',
        config.bgColor,
        config.borderColor,
        'border',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5', config.textColor)} />
        <div>
          <p className={cn('font-medium', config.textColor)}>
            {warnings.length === 1
              ? typeLabels[mostSevere.type]
              : `${warnings.length} Usage Warnings`}
          </p>
          <p className={cn('text-sm', config.textColor)}>
            {mostSevere.message}
          </p>
        </div>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href="/settings/billing">Upgrade</Link>
      </Button>
    </div>
  )
}

interface UsageMeterProps {
  label: string
  current: number
  limit: number | null
  unit?: string
  className?: string
}

/**
 * Display a usage meter with progress bar
 */
export function UsageMeter({
  label,
  current,
  limit,
  unit = '',
  className,
}: UsageMeterProps) {
  if (limit === null) {
    return (
      <div className={className}>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{current}{unit} / Unlimited</span>
        </div>
        <Progress value={0} className="h-2 bg-green-100" />
      </div>
    )
  }

  const percentage = (current / limit) * 100
  const level = percentage >= 100 ? 'exceeded' : percentage >= 95 ? 'critical' : percentage >= 80 ? 'warning' : 'none'

  const progressColors = {
    none: '',
    warning: '[&>div]:bg-yellow-500',
    critical: '[&>div]:bg-orange-500',
    exceeded: '[&>div]:bg-red-500',
  }

  return (
    <div className={className}>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          'font-medium',
          level === 'exceeded' && 'text-red-600',
          level === 'critical' && 'text-orange-600',
          level === 'warning' && 'text-yellow-600'
        )}>
          {current}{unit} / {limit}{unit}
        </span>
      </div>
      <Progress
        value={Math.min(percentage, 100)}
        className={cn('h-2', progressColors[level])}
      />
    </div>
  )
}

interface UsageOverviewProps {
  stats: {
    usersCount: number
    jobsThisMonth: number
    storageUsedMb: number
  }
  limits: {
    maxUsers: number | null
    maxJobsPerMonth: number | null
    maxStorageGb: number | null
  }
  className?: string
}

/**
 * Display an overview of all usage metrics
 */
export function UsageOverview({ stats, limits, className }: UsageOverviewProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <UsageMeter
        label="Team Members"
        current={stats.usersCount}
        limit={limits.maxUsers}
      />
      <UsageMeter
        label="Jobs This Month"
        current={stats.jobsThisMonth}
        limit={limits.maxJobsPerMonth}
      />
      <UsageMeter
        label="Storage"
        current={Math.round(stats.storageUsedMb / 1024 * 10) / 10}
        limit={limits.maxStorageGb}
        unit=" GB"
      />
    </div>
  )
}
