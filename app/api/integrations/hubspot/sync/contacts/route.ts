import { NextResponse } from 'next/server'
import { HubSpotService } from '@/lib/services/hubspot-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { syncCustomerSchema } from '@/lib/validations/integrations'

/**
 * POST /api/integrations/hubspot/sync/contacts
 * Sync contacts to HubSpot
 */
export const POST = createApiHandler(
  {
    rateLimit: 'heavy',
    bodySchema: syncCustomerSchema.optional(),
  },
  async (_request, context, body) => {
    if (body?.customer_id) {
      // Sync single customer
      const hubspotId = await HubSpotService.syncContact(
        context.profile.organization_id,
        body.customer_id
      )
      return NextResponse.json({ success: true, hubspot_id: hubspotId })
    } else {
      // Sync all contacts
      const results = await HubSpotService.syncAllContacts(context.profile.organization_id)
      return NextResponse.json({ success: true, ...results })
    }
  }
)
