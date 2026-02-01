import { NextRequest, NextResponse } from 'next/server'
import { FeedbackService } from '@/lib/services/feedback-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const testimonials = await FeedbackService.getApprovedTestimonials()

    return NextResponse.json(testimonials)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
