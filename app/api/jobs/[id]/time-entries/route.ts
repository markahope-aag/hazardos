import { NextRequest, NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createSecureErrorResponse, validateRequired, SecureError } from '@/lib/utils/secure-error-handler'
import { createClient } from '@/lib/supabase/server'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const timeEntries = await JobCompletionService.getTimeEntries(id)
    return NextResponse.json(timeEntries)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    validateRequired(body.work_date, 'work_date')
    validateRequired(body.hours, 'hours')

    const timeEntry = await JobCompletionService.createTimeEntry({
      job_id: id,
      profile_id: body.profile_id,
      work_date: body.work_date,
      hours: body.hours,
      work_type: body.work_type,
      hourly_rate: body.hourly_rate,
      billable: body.billable,
      description: body.description,
      notes: body.notes,
    })

    return NextResponse.json(timeEntry, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
