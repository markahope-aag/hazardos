import { NextResponse } from 'next/server'
import { PlatformAdminService } from '@/lib/services/platform-admin-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * GET /api/platform/stats
 * Get platform statistics (platform admin only)
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.PLATFORM_ONLY,
  },
  async () => {
    const isAdmin = await PlatformAdminService.isPlatformAdmin()
    if (!isAdmin) {
      throw new SecureError('FORBIDDEN', 'Platform admin access required')
    }

    const [stats, growth, planDistribution] = await Promise.all([
      PlatformAdminService.getPlatformStats(),
      PlatformAdminService.getGrowthMetrics(),
      PlatformAdminService.getPlanDistribution(),
    ])

    return NextResponse.json({
      stats,
      growth,
      planDistribution,
    })
  }
)
