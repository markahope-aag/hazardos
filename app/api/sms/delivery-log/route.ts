import { NextResponse } from 'next/server'
import { SmsService } from '@/lib/services/sms-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { smsDeliveryLogQuerySchema } from '@/lib/validations/sms'

/**
 * GET /api/sms/delivery-log
 * Outbound SMS delivery log with status + carrier error reasons (SMS11).
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: smsDeliveryLogQuerySchema,
  },
  async (_request, context, _body, query) => {
    const messages = await SmsService.getDeliveryLog(context.profile.organization_id, {
      status: query.status,
      message_type: query.message_type,
      limit: query.limit || 100,
    })
    return NextResponse.json({ messages })
  }
)
