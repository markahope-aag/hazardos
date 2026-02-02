import { NextResponse } from 'next/server'
import { FeedbackService } from '@/lib/services/feedback-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { feedbackListQuerySchema, createFeedbackSurveySchema } from '@/lib/validations/feedback'

/**
 * GET /api/feedback
 * List feedback surveys with pagination
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: feedbackListQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const result = await FeedbackService.listSurveys({
      status: query.status,
      job_id: query.job_id,
      customer_id: query.customer_id,
      limit: query.limit,
      offset: query.offset,
    })

    return NextResponse.json(result)
  }
)

/**
 * POST /api/feedback
 * Create a new feedback survey
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createFeedbackSurveySchema,
  },
  async (_request, _context, body) => {
    const survey = await FeedbackService.createSurvey({
      job_id: body.job_id,
      send_immediately: body.send_immediately,
      recipient_email: body.recipient_email,
    })

    return NextResponse.json(survey, { status: 201 })
  }
)
