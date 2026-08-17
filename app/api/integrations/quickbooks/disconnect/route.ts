import { NextResponse } from 'next/server'
import { ROLES } from '@/lib/auth/roles'
import { QuickBooksService } from '@/lib/services/quickbooks-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * POST /api/integrations/quickbooks/disconnect
 * Disconnect from QuickBooks
 */
export const POST = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
  async (_request, context) => {
    await QuickBooksService.disconnect(context.profile.organization_id)
    return NextResponse.json({ success: true })
  }
)
