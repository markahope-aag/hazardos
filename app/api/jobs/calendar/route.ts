import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const searchParams = request.nextUrl.searchParams
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    validateRequired(start, 'start')
    validateRequired(end, 'end')

    // Validate date format
    const startDate = new Date(start!)
    const endDate = new Date(end!)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new SecureError('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD')
    }

    const jobs = await JobsService.getCalendarEvents(start!, end!)

    return NextResponse.json(jobs)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
