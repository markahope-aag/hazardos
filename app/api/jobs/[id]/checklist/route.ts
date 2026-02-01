import { NextRequest, NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
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

    const searchParams = request.nextUrl.searchParams
    const grouped = searchParams.get('grouped') === 'true'

    if (grouped) {
      const checklist = await JobCompletionService.getChecklistGrouped(id)
      return NextResponse.json(checklist)
    }

    const checklist = await JobCompletionService.getChecklist(id)
    return NextResponse.json(checklist)
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

    // Initialize default checklist for the job
    const checklist = await JobCompletionService.initializeChecklist(id)

    return NextResponse.json(checklist, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
