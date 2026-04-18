import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { SmsService } from '@/lib/services/sms-service'

const querySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema,
  },
  async (_request, context, _body, query) => {
    const conversations = await SmsService.getConversations(context.profile.organization_id, {
      search: query.search,
      limit: query.limit,
    })
    return NextResponse.json({ conversations })
  },
)
