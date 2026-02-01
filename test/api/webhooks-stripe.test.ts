import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/webhooks/stripe/route'
import { StripeService } from '@/lib/services/stripe-service'

// Mock Stripe module
const mockConstructEvent = vi.fn()

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      webhooks = {
        constructEvent: mockConstructEvent
      }
    }
  }
})

vi.mock('@/lib/services/stripe-service', () => ({
  StripeService: {
    handleWebhookEvent: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123'
  })

  const createMockEvent = (type: string, data: any = {}) => ({
    id: `evt_${Date.now()}`,
    object: 'event' as const,
    api_version: '2026-01-28.clover' as const,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: data
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type
  })

  it('should process valid webhook with correct signature', async () => {
    const mockEvent = createMockEvent('checkout.session.completed', {
      id: 'cs_123',
      customer: 'cus_123'
    })

    mockConstructEvent.mockReturnValue(mockEvent)
    vi.mocked(StripeService.handleWebhookEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=signature'
      },
      body: JSON.stringify(mockEvent)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ received: true })
    expect(StripeService.handleWebhookEvent).toHaveBeenCalledWith(mockEvent)
  })

  it('should reject webhook without signature', async () => {
    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify({ type: 'test' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
    expect(StripeService.handleWebhookEvent).not.toHaveBeenCalled()
  })

  it('should reject webhook with invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=invalid'
      },
      body: JSON.stringify({ type: 'test' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
    expect(StripeService.handleWebhookEvent).not.toHaveBeenCalled()
  })

  it('should handle checkout.session.completed event', async () => {
    const mockEvent = createMockEvent('checkout.session.completed', {
      id: 'cs_123',
      customer: 'cus_123',
      subscription: 'sub_123',
      metadata: {
        organization_id: 'org-123'
      }
    })

    mockConstructEvent.mockReturnValue(mockEvent)
    vi.mocked(StripeService.handleWebhookEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=signature'
      },
      body: JSON.stringify(mockEvent)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(StripeService.handleWebhookEvent).toHaveBeenCalledWith(mockEvent)
  })

  it('should handle customer.subscription.created event', async () => {
    const mockEvent = createMockEvent('customer.subscription.created', {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active'
    })

    mockConstructEvent.mockReturnValue(mockEvent)
    vi.mocked(StripeService.handleWebhookEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=signature'
      },
      body: JSON.stringify(mockEvent)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(StripeService.handleWebhookEvent).toHaveBeenCalledWith(mockEvent)
  })

  it('should handle customer.subscription.updated event', async () => {
    const mockEvent = createMockEvent('customer.subscription.updated', {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active'
    })

    mockConstructEvent.mockReturnValue(mockEvent)
    vi.mocked(StripeService.handleWebhookEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=signature'
      },
      body: JSON.stringify(mockEvent)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should handle customer.subscription.deleted event', async () => {
    const mockEvent = createMockEvent('customer.subscription.deleted', {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'canceled'
    })

    mockConstructEvent.mockReturnValue(mockEvent)
    vi.mocked(StripeService.handleWebhookEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=signature'
      },
      body: JSON.stringify(mockEvent)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should handle invoice.paid event', async () => {
    const mockEvent = createMockEvent('invoice.paid', {
      id: 'in_123',
      customer: 'cus_123',
      subscription: 'sub_123',
      amount_paid: 9900,
      status: 'paid'
    })

    mockConstructEvent.mockReturnValue(mockEvent)
    vi.mocked(StripeService.handleWebhookEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=signature'
      },
      body: JSON.stringify(mockEvent)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should handle invoice.payment_failed event', async () => {
    const mockEvent = createMockEvent('invoice.payment_failed', {
      id: 'in_123',
      customer: 'cus_123',
      amount_due: 9900,
      status: 'open'
    })

    mockConstructEvent.mockReturnValue(mockEvent)
    vi.mocked(StripeService.handleWebhookEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=signature'
      },
      body: JSON.stringify(mockEvent)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should handle unrecognized event types gracefully', async () => {
    const mockEvent = createMockEvent('some.unknown.event', {
      id: 'obj_123'
    })

    mockConstructEvent.mockReturnValue(mockEvent)
    vi.mocked(StripeService.handleWebhookEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=signature'
      },
      body: JSON.stringify(mockEvent)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should handle service errors during event processing', async () => {
    const mockEvent = createMockEvent('checkout.session.completed', {
      id: 'cs_123'
    })

    mockConstructEvent.mockReturnValue(mockEvent)
    vi.mocked(StripeService.handleWebhookEvent).mockRejectedValue(
      new Error('Database error')
    )

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=signature'
      },
      body: JSON.stringify(mockEvent)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
  })

  it('should verify webhook signature with body text', async () => {
    const mockEvent = createMockEvent('checkout.session.completed', {
      id: 'cs_123'
    })

    const bodyText = JSON.stringify(mockEvent)

    mockConstructEvent.mockImplementation((body, signature, secret) => {
      expect(body).toBe(bodyText)
      expect(signature).toBe('t=123,v1=signature')
      expect(secret).toBe('whsec_test_123')
      return mockEvent
    })

    vi.mocked(StripeService.handleWebhookEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=signature'
      },
      body: bodyText
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should handle replay attacks with old timestamps', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Timestamp outside of tolerance zone')
    })

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=1000000000,v1=signature'
      },
      body: JSON.stringify({ type: 'test' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should process subscription status change to past_due', async () => {
    const mockEvent = createMockEvent('customer.subscription.updated', {
      id: 'sub_123',
      customer: 'cus_123',
      status: 'past_due'
    })

    mockConstructEvent.mockReturnValue(mockEvent)
    vi.mocked(StripeService.handleWebhookEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=signature'
      },
      body: JSON.stringify(mockEvent)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should handle payment failure with retry info', async () => {
    const mockEvent = createMockEvent('invoice.payment_failed', {
      id: 'in_123',
      customer: 'cus_123',
      amount_due: 9900,
      attempt_count: 3
    })

    mockConstructEvent.mockReturnValue(mockEvent)
    vi.mocked(StripeService.handleWebhookEvent).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123,v1=signature'
      },
      body: JSON.stringify(mockEvent)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })
})
