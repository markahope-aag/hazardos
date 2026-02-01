import { NextResponse } from 'next/server'
import { SmsService } from '@/lib/services/sms-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { sendSmsSchema } from '@/lib/validations/sms'

/**
 * POST /api/sms/send
 * Send an SMS message
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: sendSmsSchema,
  },
  async (_request, context, body) => {
    const message = await SmsService.send(context.profile.organization_id, {
      to: body.to,
      body: body.body,
      message_type: body.message_type,
      customer_id: body.customer_id,
      related_entity_type: body.related_entity_type,
      related_entity_id: body.related_entity_id,
    })
    return NextResponse.json(message, { status: 201 })
  }
)
