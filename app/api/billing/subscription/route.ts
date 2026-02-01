import { NextResponse } from 'next/server'
import { StripeService } from '@/lib/services/stripe-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { cancelSubscriptionSchema } from '@/lib/validations/billing'

/**
 * GET /api/billing/subscription
 * Get subscription info
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const subscription = await StripeService.getSubscription(context.profile.organization_id)
    return NextResponse.json(subscription)
  }
)

/**
 * DELETE /api/billing/subscription
 * Cancel subscription
 */
export const DELETE = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: cancelSubscriptionSchema,
    allowedRoles: ['owner', 'admin', 'tenant_owner'],
  },
  async (_request, context, body) => {
    await StripeService.cancelSubscription(
      context.profile.organization_id,
      body.reason,
      body.cancel_immediately || false
    )
    return NextResponse.json({ success: true })
  }
)
