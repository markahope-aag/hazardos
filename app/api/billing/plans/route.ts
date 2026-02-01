import { NextResponse } from 'next/server'
import { StripeService } from '@/lib/services/stripe-service'
import { createSecureErrorResponse } from '@/lib/utils/secure-error-handler'

export async function GET() {
  try {
    const plans = await StripeService.getPlans()
    return NextResponse.json(plans)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
