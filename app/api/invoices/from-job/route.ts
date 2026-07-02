import { NextResponse } from 'next/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { createInvoiceFromJobSchema } from '@/lib/validations/invoices'

/**
 * POST /api/invoices/from-job
 * Create an invoice from a job. Financial action — restricted to admins,
 * matching the other invoice-mutation routes (POST /invoices, void, PATCH).
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: createInvoiceFromJobSchema,
  },
  async (_request, _context, body) => {
    const invoice = await InvoicesService.createFromJob(body)
    return NextResponse.json(invoice, { status: 201 })
  }
)
