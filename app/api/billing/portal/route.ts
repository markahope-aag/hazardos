import { NextResponse } from 'next/server'
import { StripeService } from '@/lib/services/stripe-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createPortalSchema } from '@/lib/validations/billing'

/**
 * POST /api/billing/portal
 * Create a billing portal session
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createPortalSchema,
  },
  async (_request, context, body) => {
    const portalUrl = await StripeService.createBillingPortalSession(
      context.profile.organization_id,
      body.return_url || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`
    )

    return NextResponse.json({ url: portalUrl })
  }
)
