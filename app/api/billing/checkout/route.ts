import { NextResponse } from 'next/server'
import { StripeService } from '@/lib/services/stripe-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createCheckoutSchema } from '@/lib/validations/billing'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/billing/checkout
 * Create a checkout session
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createCheckoutSchema,
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, context, body) => {
    const checkoutUrl = await StripeService.createCheckoutSession(
      context.profile.organization_id,
      body.plan_slug,
      body.billing_cycle || 'monthly',
      body.success_url,
      body.cancel_url
    )

    return NextResponse.json({ url: checkoutUrl })
  }
)
