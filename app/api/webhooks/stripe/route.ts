import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { StripeService } from '@/lib/services/stripe-service'
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
      apiVersion: '2026-01-28.clover',
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

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      throw new SecureError('VALIDATION_ERROR', 'No signature')
    }

    let event: Stripe.Event

    try {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
    } catch (_err) {
      throw new SecureError('VALIDATION_ERROR', 'Invalid signature')
    }

    await StripeService.handleWebhookEvent(event)
    return NextResponse.json({ received: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
