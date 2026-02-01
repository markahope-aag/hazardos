import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    if (!body.profile_id) {
      return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
    }

    const crew = await JobsService.assignCrew({
      job_id: id,
      ...body,
    })

    return NextResponse.json(crew, { status: 201 })
  } catch (error) {
    console.error('Assign crew error:', error)
    // Check for duplicate key error
    if (error instanceof Error && error.message.includes('duplicate')) {
      return NextResponse.json(
        { error: 'This crew member is already assigned to this job' },
        { status: 400 }
      )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { profile_id } = await request.json()

    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
    }

    await JobsService.removeCrew(id, profile_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove crew error:', error)
    return createSecureErrorResponse(error)
  }
}
