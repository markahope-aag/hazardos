import { NextResponse } from 'next/server'
import { MailchimpService } from '@/lib/services/mailchimp-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * POST /api/integrations/mailchimp/disconnect
 * Disconnect Mailchimp integration
 */
export const POST = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    await MailchimpService.disconnect(context.profile.organization_id)
    return NextResponse.json({ success: true })
  }
)
