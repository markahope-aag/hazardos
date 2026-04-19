import { NextResponse } from 'next/server'
import { InvoiceDeliveryService } from '@/lib/services/invoice-delivery-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { sendInvoiceSchema } from '@/lib/validations/invoices'

/**
 * POST /api/invoices/[id]/send
 * Send an invoice via email
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: sendInvoiceSchema,
  },
  async (_request, _context, params, body) => {
    const method = body.email ? 'email' : 'email'
    const invoice = await InvoiceDeliveryService.send(params.id, method)
    return NextResponse.json(invoice)
  }
)
