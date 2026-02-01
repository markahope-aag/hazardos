import { NextResponse } from 'next/server'
import { SmsService } from '@/lib/services/sms-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { smsMessagesQuerySchema } from '@/lib/validations/sms'

/**
 * GET /api/sms/messages
 * List SMS messages
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: smsMessagesQuerySchema,
  },
  async (_request, context, _body, query) => {
    const messages = await SmsService.getMessages(context.profile.organization_id, {
      customer_id: query.customer_id,
      status: query.status,
      message_type: query.message_type,
      limit: query.limit || 50,
    })
    return NextResponse.json(messages)
  }
)
