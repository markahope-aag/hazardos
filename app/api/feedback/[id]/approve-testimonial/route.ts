import { NextRequest, NextResponse } from 'next/server'
import { FeedbackService } from '@/lib/services/feedback-service'
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

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'tenant_owner', 'platform_owner', 'platform_admin'].includes(profile.role)) {
      throw new SecureError('FORBIDDEN', 'Only admins can approve testimonials')
    }

    const survey = await FeedbackService.approveTestimonial(id)

    return NextResponse.json(survey)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function DELETE(
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

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'tenant_owner', 'platform_owner', 'platform_admin'].includes(profile.role)) {
      throw new SecureError('FORBIDDEN', 'Only admins can reject testimonials')
    }

    const survey = await FeedbackService.rejectTestimonial(id)

    return NextResponse.json(survey)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
