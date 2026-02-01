import { NextResponse } from 'next/server'
import { InvoicesService } from '@/lib/services/invoices-service'
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
    const invoice = await InvoicesService.send(params.id, method)
    return NextResponse.json(invoice)
  }
)
