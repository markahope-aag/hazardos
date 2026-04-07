import { NextResponse } from 'next/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/invoices/[id]/void
 * Void an invoice
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, _context, params) => {
    const invoice = await InvoicesService.void(params.id)
    return NextResponse.json(invoice)
  }
)
