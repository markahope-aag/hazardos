import { NextRequest, NextResponse } from 'next/server'
import { FeedbackService } from '@/lib/services/feedback-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

type RouteParams = { params: Promise<{ token: string }> }

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Apply rate limiting for public endpoints
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'public')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { token } = await params

    const survey = await FeedbackService.getSurveyByToken(token)

    if (!survey) {
      throw new SecureError('NOT_FOUND', 'Survey not found or has expired')
    }

    return NextResponse.json(survey)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Apply rate limiting for public endpoints (stricter for submissions)
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'auth')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { token } = await params
    const body = await request.json()

    // Get client info for tracking
    const ipAddress = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    const survey = await FeedbackService.submitFeedback(
      token,
      {
        rating_overall: body.rating_overall,
        rating_quality: body.rating_quality,
        rating_communication: body.rating_communication,
        rating_timeliness: body.rating_timeliness,
        rating_value: body.rating_value,
        would_recommend: body.would_recommend,
        likelihood_to_recommend: body.likelihood_to_recommend,
        feedback_text: body.feedback_text,
        improvement_suggestions: body.improvement_suggestions,
        testimonial_text: body.testimonial_text,
        testimonial_permission: body.testimonial_permission,
      },
      ipAddress,
      userAgent
    )

    return NextResponse.json(survey)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
