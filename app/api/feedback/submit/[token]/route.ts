import { NextRequest, NextResponse } from 'next/server'
import { FeedbackService } from '@/lib/services/feedback-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'
import { submitFeedbackSchema } from '@/lib/validations/feedback'

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

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new SecureError('VALIDATION_ERROR', 'Invalid JSON body')
    }

    const validationResult = submitFeedbackSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      throw new SecureError('VALIDATION_ERROR', `Invalid feedback data: ${errors}`)
    }

    const feedbackData = validationResult.data

    // Get client info for tracking
    const ipAddress = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    const survey = await FeedbackService.submitFeedback(
      token,
      feedbackData,
      ipAddress,
      userAgent
    )

    return NextResponse.json(survey)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
