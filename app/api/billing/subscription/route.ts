import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StripeService } from '@/lib/services/stripe-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'Organization not found')
    }

    const subscription = await StripeService.getSubscription(profile.organization_id)
    return NextResponse.json(subscription)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'Organization not found')
    }

    if (profile.role !== 'owner' && profile.role !== 'admin' && profile.role !== 'tenant_owner') {
      throw new SecureError('FORBIDDEN', 'Only admins can manage billing')
    }

    const body = await request.json()
    const { reason, cancel_immediately } = body

    await StripeService.cancelSubscription(
      profile.organization_id,
      reason,
      cancel_immediately || false
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
