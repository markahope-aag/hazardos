import { NextResponse } from 'next/server'
import { FeatureFlagsService } from '@/lib/services/feature-flags-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/billing/features
 * Get feature flags and usage limits
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const [featureFlags, usageLimits, usageStats, usageWarnings] = await Promise.all([
      FeatureFlagsService.getFeatureFlagsForOrg(context.profile.organization_id),
      FeatureFlagsService.getUsageLimitsForOrg(context.profile.organization_id),
      FeatureFlagsService.getUsageStats(context.profile.organization_id),
      FeatureFlagsService.checkUsageWarnings(context.profile.organization_id),
    ])

    return NextResponse.json({
      features: featureFlags,
      limits: usageLimits,
      usage: usageStats,
      warnings: usageWarnings,
    })
  }
)
