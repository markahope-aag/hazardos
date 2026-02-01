import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CommissionService } from '@/lib/services/commission-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const plans = await CommissionService.getPlans()
    return NextResponse.json(plans)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const body = await request.json()
    const { name, commission_type, base_rate, tiers, applies_to } = body

    if (!name || !commission_type) {
      throw new SecureError('VALIDATION_ERROR', 'name and commission_type are required')
    }

    const plan = await CommissionService.createPlan({
      name,
      commission_type,
      base_rate,
      tiers,
      applies_to,
    })

    return NextResponse.json(plan)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
