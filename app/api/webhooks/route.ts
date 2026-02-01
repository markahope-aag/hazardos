import { NextResponse } from 'next/server'
import { WebhookService } from '@/lib/services/webhook-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createWebhookSchema } from '@/lib/validations/webhooks'

/**
 * GET /api/webhooks
 * List webhooks
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const webhooks = await WebhookService.list(context.profile.organization_id)
    return NextResponse.json({ webhooks })
  }
)

/**
 * POST /api/webhooks
 * Create a webhook
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createWebhookSchema,
  },
  async (_request, context, body) => {
    const webhook = await WebhookService.create(context.profile.organization_id, {
      ...body,
      secret: body.secret || WebhookService.generateSecret(),
    })
    return NextResponse.json({ webhook })
  }
)
