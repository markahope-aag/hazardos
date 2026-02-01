import { NextRequest, NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { createClient } from '@/lib/supabase/server'

type RouteParams = { params: Promise<{ id: string }> }

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

    // Check if user has admin/manager role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'tenant_owner', 'platform_owner', 'platform_admin'].includes(profile.role)) {
      throw new SecureError('FORBIDDEN', 'Only admins can approve job completions')
    }

    const body = await request.json()

    const completion = await JobCompletionService.approveCompletion(id, {
      review_notes: body.review_notes,
    })

    return NextResponse.json(completion)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
