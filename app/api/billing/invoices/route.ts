import { NextResponse } from 'next/server'
import { StripeService } from '@/lib/services/stripe-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/billing/invoices
 * List billing invoices
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const invoices = await StripeService.getInvoices(context.profile.organization_id)
    return NextResponse.json(invoices)
  }
)
