import { NextResponse } from 'next/server'
import { FeedbackService } from '@/lib/services/feedback-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { sendFeedbackSchema } from '@/lib/validations/feedback'

/**
 * POST /api/feedback/[id]/send
 * Send a feedback survey
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: sendFeedbackSchema,
  },
  async (_request, _context, params, body) => {
    await FeedbackService.sendSurvey(params.id, body.recipient_email)
    return NextResponse.json({ success: true })
  }
)
