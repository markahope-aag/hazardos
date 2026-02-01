import { NextResponse } from 'next/server'
import { StripeService } from '@/lib/services/stripe-service'
import { createPublicApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/billing/plans
 * List available plans (public)
 */
export const GET = createPublicApiHandler(
  { rateLimit: 'general' },
  async () => {
    const plans = await StripeService.getPlans()
    return NextResponse.json(plans)
  }
)
