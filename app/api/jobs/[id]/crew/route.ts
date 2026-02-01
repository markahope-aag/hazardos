import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { id } = await params
    const body = await request.json()

    validateRequired(body.profile_id, 'profile_id')

    const crew = await JobsService.assignCrew({
      job_id: id,
      ...body,
    })

    return NextResponse.json(crew, { status: 201 })
  } catch (error) {
    // Check for duplicate key error
    if (error instanceof Error && error.message.includes('duplicate')) {
      return createSecureErrorResponse(new SecureError('VALIDATION_ERROR', 'This crew member is already assigned to this job'))
    }
    return createSecureErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { id } = await params
    const { profile_id } = await request.json()

    validateRequired(profile_id, 'profile_id')

    await JobsService.removeCrew(id, profile_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
