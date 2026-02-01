import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CommissionService } from '@/lib/services/commission-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { id } = await params
    const body = await request.json()
    const { action } = body

    let earning

    if (action === 'approve') {
      earning = await CommissionService.approveEarning(id)
    } else if (action === 'mark_paid') {
      earning = await CommissionService.markPaid(id)
    } else {
      throw new SecureError('VALIDATION_ERROR', 'Invalid action')
    }

    return NextResponse.json(earning)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
