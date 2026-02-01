import { NextResponse } from 'next/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createInvoiceFromJobSchema } from '@/lib/validations/invoices'

/**
 * POST /api/invoices/from-job
 * Create an invoice from a job
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createInvoiceFromJobSchema,
  },
  async (_request, _context, body) => {
    const invoice = await InvoicesService.createFromJob(body)
    return NextResponse.json(invoice, { status: 201 })
  }
)
