import { NextResponse } from 'next/server'
import { QuickBooksService } from '@/lib/services/quickbooks-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { syncInvoiceSchema } from '@/lib/validations/integrations'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/integrations/quickbooks/sync/invoice
 * Sync an invoice to QuickBooks
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: syncInvoiceSchema,
    // Pushing data to the org's QuickBooks is an admin-only integration action
    // (I18: was ungated, so any tenant user could trigger a QB sync).
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, context, body) => {
    const qbId = await QuickBooksService.syncInvoiceToQBO(
      context.profile.organization_id,
      body.invoice_id
    )

    return NextResponse.json({ qb_invoice_id: qbId })
  }
)
