import { NextResponse } from 'next/server'
import { QuickBooksService } from '@/lib/services/quickbooks-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { syncInvoiceSchema } from '@/lib/validations/integrations'

/**
 * POST /api/integrations/quickbooks/sync/invoice
 * Sync an invoice to QuickBooks
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: syncInvoiceSchema,
  },
  async (_request, context, body) => {
    const qbId = await QuickBooksService.syncInvoiceToQBO(
      context.profile.organization_id,
      body.invoice_id
    )

    return NextResponse.json({ qb_invoice_id: qbId })
  }
)
