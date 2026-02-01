import { NextResponse } from 'next/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { invoiceListQuerySchema, createInvoiceSchema } from '@/lib/validations/invoices'

/**
 * GET /api/invoices
 * List all invoices for the current organization
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: invoiceListQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const filters = {
      status: query.status || undefined,
      customer_id: query.customer_id || undefined,
      job_id: query.job_id || undefined,
      from_date: query.from_date || undefined,
      to_date: query.to_date || undefined,
      overdue_only: query.overdue || false,
    }

    const invoices = await InvoicesService.list(filters)
    return NextResponse.json({ invoices })
  }
)

/**
 * POST /api/invoices
 * Create a new invoice
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createInvoiceSchema,
  },
  async (_request, _context, body) => {
    const invoice = await InvoicesService.create(body)
    return NextResponse.json(invoice, { status: 201 })
  }
)
