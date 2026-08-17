import { NextResponse } from 'next/server'
import { HubSpotService } from '@/lib/services/hubspot-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/integrations/hubspot/disconnect
 * Disconnect HubSpot integration
 */
export const POST = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
  async (_request, context) => {
    await HubSpotService.disconnect(context.profile.organization_id)
    return NextResponse.json({ success: true })
  }
)
