import { NextResponse } from 'next/server'
import { PlatformAdminService } from '@/lib/services/platform-admin-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function GET() {
  try {
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
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
