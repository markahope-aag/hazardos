import { NextResponse } from 'next/server'
import { SegmentationService } from '@/lib/services/segmentation-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * POST /api/segments/[id]/sync/hubspot
 * Sync segment to HubSpot
 */
export const POST = createApiHandlerWithParams(
  { rateLimit: 'heavy' },
  async (_request, context, params) => {
    // Check HubSpot is connected
    const { data: integration } = await context.supabase
      .from('organization_integrations')
      .select('id')
      .eq('organization_id', context.profile.organization_id)
      .eq('integration_type', 'hubspot')
      .eq('is_active', true)
      .single()

    if (!integration) {
      throw new SecureError('BAD_REQUEST', 'HubSpot is not connected')
    }

    await SegmentationService.syncToHubSpot(params.id)

    return NextResponse.json({ success: true })
  }
)
