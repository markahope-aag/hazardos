import { NextResponse } from 'next/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { addPaymentSchema } from '@/lib/validations/invoices'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { z } from 'zod'

const deleteQuerySchema = z.object({
  payment_id: z.string().uuid('Invalid payment ID'),
})

/**
 * POST /api/invoices/[id]/payments
 * Record a payment for an invoice
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: addPaymentSchema,
  },
  async (_request, _context, params, body) => {
    const payment = await InvoicesService.recordPayment(params.id, body)
    return NextResponse.json(payment, { status: 201 })
  }
)

/**
 * DELETE /api/invoices/[id]/payments
 * Delete a payment
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    querySchema: deleteQuerySchema,
  },
  async (_request, _context, _params, _body, query) => {
    if (!query.payment_id) {
      throw new SecureError('VALIDATION_ERROR', 'payment_id is required')
    }
    await InvoicesService.deletePayment(query.payment_id)
    return NextResponse.json({ success: true })
  }
)
