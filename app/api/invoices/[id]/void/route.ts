import { NextResponse } from 'next/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'

/**
 * POST /api/invoices/[id]/void
 * Void an invoice
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'],
  },
  async (_request, _context, params) => {
    const invoice = await InvoicesService.void(params.id)
    return NextResponse.json(invoice)
  }
)
