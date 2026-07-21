import { NextResponse } from 'next/server'
import { QuickBooksService } from '@/lib/services/quickbooks-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { syncCustomerSchema } from '@/lib/validations/integrations'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/integrations/quickbooks/sync/customer
 * Sync a customer to QuickBooks
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: syncCustomerSchema,
    // Admin-only integration action (was ungated).
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, context, body) => {
    const qbId = await QuickBooksService.syncCustomerToQBO(
      context.profile.organization_id,
      body.customer_id
    )

    return NextResponse.json({ qb_customer_id: qbId })
  }
)
