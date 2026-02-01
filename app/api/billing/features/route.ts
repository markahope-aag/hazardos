import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FeatureFlagsService } from '@/lib/services/feature-flags-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'Organization not found')
    }

    const [featureFlags, usageLimits, usageStats, usageWarnings] = await Promise.all([
      FeatureFlagsService.getFeatureFlagsForOrg(profile.organization_id),
      FeatureFlagsService.getUsageLimitsForOrg(profile.organization_id),
      FeatureFlagsService.getUsageStats(profile.organization_id),
      FeatureFlagsService.checkUsageWarnings(profile.organization_id),
    ])

    return NextResponse.json({
      features: featureFlags,
      limits: usageLimits,
      usage: usageStats,
      warnings: usageWarnings,
    })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
