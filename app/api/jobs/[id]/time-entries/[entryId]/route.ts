import { NextRequest, NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { createClient } from '@/lib/supabase/server'

type RouteParams = { params: Promise<{ id: string; entryId: string }> }

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { entryId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    const timeEntry = await JobCompletionService.updateTimeEntry(entryId, {
      work_date: body.work_date,
      hours: body.hours,
      work_type: body.work_type,
      hourly_rate: body.hourly_rate,
      billable: body.billable,
      description: body.description,
      notes: body.notes,
    })

    return NextResponse.json(timeEntry)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { entryId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    await JobCompletionService.deleteTimeEntry(entryId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
