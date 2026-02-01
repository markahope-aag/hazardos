'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, Sparkles } from 'lucide-react'
import type { FeatureFlag } from '@/types/feature-flags'
import { featureFlagConfigs } from '@/types/feature-flags'
import { cn } from '@/lib/utils'

interface FeatureGateProps {
  feature: FeatureFlag
  enabled: boolean
  children: ReactNode
  fallback?: ReactNode
  showUpgradePrompt?: boolean
}

/**
 * Conditionally render content based on feature flag status
 */
export function FeatureGate({
  feature,
  enabled,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  if (enabled) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (showUpgradePrompt) {
    const config = featureFlagConfigs.find((f) => f.key === feature)
    return (
      <FeatureLockedCard
        featureName={config?.name || feature}
        featureDescription={config?.description}
        requiredPlan={config?.requiredPlan || 'pro'}
      />
    )
  }

  return null
}

interface FeatureLockedCardProps {
  featureName: string
  featureDescription?: string
  requiredPlan: 'starter' | 'pro' | 'enterprise'
}

/**
 * Display a locked feature card with upgrade prompt
 */
export function FeatureLockedCard({
  featureName,
  featureDescription,
  requiredPlan,
}: FeatureLockedCardProps) {
  const planLabels = {
    starter: 'Starter',
    pro: 'Professional',
    enterprise: 'Enterprise',
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="text-center pb-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">{featureName}</CardTitle>
        {featureDescription && (
          <CardDescription>{featureDescription}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="text-center">
        <Badge variant="secondary" className="mb-4">
          <Sparkles className="h-3 w-3 mr-1" />
          {planLabels[requiredPlan]} Plan Required
        </Badge>
        <p className="text-sm text-muted-foreground mb-4">
          Upgrade your plan to unlock this feature.
        </p>
        <Button asChild>
          <Link href="/settings/billing">Upgrade Plan</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

interface FeatureBadgeProps {
  feature: FeatureFlag
  enabled: boolean
  className?: string
}

/**
 * Display a badge indicating feature availability
 */
export function FeatureBadge({ feature, enabled, className }: FeatureBadgeProps) {
  const config = featureFlagConfigs.find((f) => f.key === feature)
  const planLabels = {
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise',
  }

  if (enabled) {
    return (
      <Badge variant="secondary" className={cn('bg-green-100 text-green-800', className)}>
        Enabled
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={cn('text-muted-foreground', className)}>
      <Lock className="h-3 w-3 mr-1" />
      {planLabels[config?.requiredPlan || 'pro']}
    </Badge>
  )
}

interface FeatureListItemProps {
  feature: FeatureFlag
  enabled: boolean
  onClick?: () => void
}

/**
 * Display a feature in a list with locked/unlocked status
 */
export function FeatureListItem({ feature, enabled, onClick }: FeatureListItemProps) {
  const config = featureFlagConfigs.find((f) => f.key === feature)

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        enabled ? 'bg-background' : 'bg-muted/30',
        onClick && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {!enabled && <Lock className="h-4 w-4 text-muted-foreground" />}
        <div>
          <p className={cn('font-medium', !enabled && 'text-muted-foreground')}>
            {config?.name || feature}
          </p>
          {config?.description && (
            <p className="text-sm text-muted-foreground">{config.description}</p>
          )}
        </div>
      </div>
      <FeatureBadge feature={feature} enabled={enabled} />
    </div>
  )
}
