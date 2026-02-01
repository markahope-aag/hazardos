import { NextRequest, NextResponse } from 'next/server'
import { FeedbackService } from '@/lib/services/feedback-service'
import { createSecureErrorResponse, validateRequired, SecureError } from '@/lib/utils/secure-error-handler'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || undefined
    const job_id = searchParams.get('job_id') || undefined
    const customer_id = searchParams.get('customer_id') || undefined

    const surveys = await FeedbackService.listSurveys({
      status,
      job_id,
      customer_id,
    })

    return NextResponse.json(surveys)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    validateRequired(body.job_id, 'job_id')

    const survey = await FeedbackService.createSurvey({
      job_id: body.job_id,
      send_immediately: body.send_immediately,
      recipient_email: body.recipient_email,
    })

    return NextResponse.json(survey, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
