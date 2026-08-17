import { NextResponse } from 'next/server'
import { MailchimpService } from '@/lib/services/mailchimp-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/integrations/mailchimp/disconnect
 * Disconnect Mailchimp integration
 */
export const POST = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
  async (_request, context) => {
    await MailchimpService.disconnect(context.profile.organization_id)
    return NextResponse.json({ success: true })
  }
)
