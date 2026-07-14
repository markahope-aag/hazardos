import { NextResponse } from 'next/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateInvoiceSchema } from '@/lib/validations/invoices'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * GET /api/invoices/[id]
 * Get a single invoice
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, _context, params) => {
    const invoice = await InvoicesService.getById(params.id)

    if (!invoice) {
      throw new SecureError('NOT_FOUND', 'Invoice not found')
    }

    return NextResponse.json(invoice)
  }
)

/**
 * PATCH /api/invoices/[id]
 * Update an invoice
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateInvoiceSchema,
  },
  async (_request, _context, params, body) => {
    // A finalized invoice is a locked financial record — edits are draft-only.
    await InvoicesService.assertDraftEditable(params.id)
    const invoice = await InvoicesService.update(params.id, body)
    return NextResponse.json(invoice)
  }
)

/**
 * DELETE /api/invoices/[id]
 * Delete an invoice
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, _context, params) => {
    // Only drafts can be hard-deleted; issued invoices must be voided so the
    // financial record is preserved.
    await InvoicesService.assertDraftEditable(params.id)
    await InvoicesService.delete(params.id)
    return NextResponse.json({ success: true })
  }
)
