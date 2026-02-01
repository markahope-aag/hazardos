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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'Organization not found')
    }

    const body = await request.json()
    const { return_url } = body

    const portalUrl = await StripeService.createBillingPortalSession(
      profile.organization_id,
      return_url || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`
    )

    return NextResponse.json({ url: portalUrl })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
