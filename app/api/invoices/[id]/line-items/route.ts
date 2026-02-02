import { NextResponse } from 'next/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { addInvoiceLineItemSchema, updateInvoiceLineItemSchema } from '@/lib/validations/invoices'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { z } from 'zod'

const deleteQuerySchema = z.object({
  line_item_id: z.string().uuid('Invalid line item ID'),
})

/**
 * POST /api/invoices/[id]/line-items
 * Add a line item to an invoice
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: addInvoiceLineItemSchema,
  },
  async (_request, _context, params, body) => {
    const lineItem = await InvoicesService.addLineItem(params.id, body)
    return NextResponse.json(lineItem, { status: 201 })
  }
)

/**
 * PATCH /api/invoices/[id]/line-items
 * Update a line item
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateInvoiceLineItemSchema,
  },
  async (_request, _context, _params, body) => {
    const { line_item_id, ...updates } = body
    const lineItem = await InvoicesService.updateLineItem(line_item_id, updates)
    return NextResponse.json(lineItem)
  }
)

/**
 * DELETE /api/invoices/[id]/line-items
 * Delete a line item
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    querySchema: deleteQuerySchema,
  },
  async (_request, _context, _params, _body, query) => {
    if (!query.line_item_id) {
      throw new SecureError('VALIDATION_ERROR', 'line_item_id is required')
    }
    await InvoicesService.deleteLineItem(query.line_item_id)
    return NextResponse.json({ success: true })
  }
)
