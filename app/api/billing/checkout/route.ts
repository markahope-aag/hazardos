import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StripeService } from '@/lib/services/stripe-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function POST(request: NextRequest) {
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
    const { plan_slug, billing_cycle, success_url, cancel_url } = body

    if (!plan_slug || !success_url || !cancel_url) {
      throw new SecureError('VALIDATION_ERROR', 'Missing required fields')
    }

    const checkoutUrl = await StripeService.createCheckoutSession(
      profile.organization_id,
      plan_slug,
      billing_cycle || 'monthly',
      success_url,
      cancel_url
    )

    return NextResponse.json({ url: checkoutUrl })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
