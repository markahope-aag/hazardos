import { NextResponse } from 'next/server'
import { ROLES } from '@/lib/auth/roles'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { setActiveEstimateVersion } from '@/lib/services/estimate-versioning'

/**
 * POST /api/estimates/[id]/activate
 *
 * Marks this version as the active one in its chain, unsetting whichever
 * version had it. See lib/services/estimate-versioning.ts.
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
  },
  async (_request, context, params) => {
    await setActiveEstimateVersion(context.supabase, context.profile.organization_id, params.id)

    return NextResponse.json({ success: true })
  },
)
