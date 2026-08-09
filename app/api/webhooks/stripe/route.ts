import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { StripeService } from '@/lib/services/stripe-service'
import { STRIPE_API_VERSION } from '@/lib/services/stripe-api-version'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

// Lazy initialization to avoid build-time errors
let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Shared with StripeService so the client that creates objects and the
      // one that reads webhook payloads can never drift apart. See the note
      // on STRIPE_API_VERSION for why this is pinned rather than tracking the
      // SDK default.
      apiVersion: STRIPE_API_VERSION,
    })
  }
  return _stripe
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for webhooks
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'webhook')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      throw new SecureError('VALIDATION_ERROR', 'No signature')
    }

    let event: Stripe.Event

    try {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
    } catch {
      throw new SecureError('VALIDATION_ERROR', 'Invalid signature')
    }

    await StripeService.handleWebhookEvent(event)
    return NextResponse.json({ received: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
