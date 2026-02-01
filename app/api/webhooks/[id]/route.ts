import { NextResponse } from 'next/server'
import { WebhookService } from '@/lib/services/webhook-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateWebhookSchema } from '@/lib/validations/webhooks'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/webhooks/[id]
 * Get a webhook with delivery history
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    const webhook = await WebhookService.get(params.id)

    if (!webhook) {
      throw new SecureError('NOT_FOUND', 'Webhook not found')
    }

    const deliveries = await WebhookService.getDeliveries(params.id)

    return NextResponse.json({ webhook, deliveries })
  }
)

/**
 * PUT /api/webhooks/[id]
 * Update a webhook
 */
export const PUT = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateWebhookSchema,
  },
  async (_request, _context, params, body) => {
    const webhook = await WebhookService.update(params.id, body)
    return NextResponse.json({ webhook })
  }
)

/**
 * DELETE /api/webhooks/[id]
 * Delete a webhook
 */
export const DELETE = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    await WebhookService.delete(params.id)
    return NextResponse.json({ success: true })
  }
)
