import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CommissionService } from '@/lib/services/commission-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const status = searchParams.get('status') as 'pending' | 'approved' | 'paid' | null
    const payPeriod = searchParams.get('pay_period')

    const earnings = await CommissionService.getEarnings({
      user_id: userId || undefined,
      status: status || undefined,
      pay_period: payPeriod || undefined,
    })

    return NextResponse.json(earnings)
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
    const { user_id, plan_id, opportunity_id, job_id, invoice_id, base_amount } = body

    if (!user_id || !plan_id || base_amount === undefined) {
      throw new SecureError('VALIDATION_ERROR', 'user_id, plan_id, and base_amount are required')
    }

    const earning = await CommissionService.createEarning({
      user_id,
      plan_id,
      opportunity_id,
      job_id,
      invoice_id,
      base_amount,
    })

    return NextResponse.json(earning)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
