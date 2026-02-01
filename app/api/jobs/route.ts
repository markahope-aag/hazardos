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
    const filters = {
      status: searchParams.get('status') || undefined,
      customer_id: searchParams.get('customer_id') || undefined,
      from_date: searchParams.get('from_date') || undefined,
      to_date: searchParams.get('to_date') || undefined,
      crew_member_id: searchParams.get('crew_member_id') || undefined,
    }

    const jobs = await JobsService.list(filters)
    return NextResponse.json(jobs)
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

    // Validate required fields
    validateRequired(body.customer_id, 'customer_id')
    validateRequired(body.scheduled_start_date, 'scheduled_start_date')
    validateRequired(body.job_address, 'job_address')

    const job = await JobsService.create(body)

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
