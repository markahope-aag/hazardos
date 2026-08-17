import { NextResponse } from 'next/server'
import { FeedbackService } from '@/lib/services/feedback-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { sendFeedbackSchema } from '@/lib/validations/feedback'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/feedback/[id]/send
 * Send a feedback survey
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: sendFeedbackSchema,
    allowedRoles: ROLES.TENANT_WRITE,
  },
  async (_request, _context, params, body) => {
    await FeedbackService.sendSurvey(params.id, body.recipient_email)
    return NextResponse.json({ success: true })
  }
)
