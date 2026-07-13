import { NextResponse } from 'next/server'
import { InvoiceDeliveryService } from '@/lib/services/invoice-delivery-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { sendInvoiceSchema } from '@/lib/validations/invoices'

/**
 * POST /api/invoices/[id]/send
 * Send an invoice via email
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: sendInvoiceSchema,
  },
  async (_request, _context, params, body) => {
    const invoice = await InvoiceDeliveryService.send(params.id, body.method)
    return NextResponse.json(invoice)
  }
)
