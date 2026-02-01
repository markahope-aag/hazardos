import { NextResponse } from 'next/server'
import { HubSpotService } from '@/lib/services/hubspot-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * POST /api/integrations/hubspot/disconnect
 * Disconnect HubSpot integration
 */
export const POST = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    await HubSpotService.disconnect(context.profile.organization_id)
    return NextResponse.json({ success: true })
  }
)
