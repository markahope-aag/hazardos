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
    const date = searchParams.get('date')

    validateRequired(date, 'date')

    // Validate date format
    const checkDate = new Date(date!)
    if (isNaN(checkDate.getTime())) {
      throw new SecureError('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD')
    }

    const crew = await JobsService.getAvailableCrew(date!)

    return NextResponse.json(crew)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
