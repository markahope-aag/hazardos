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

    const summary = await CommissionService.getSummary(userId || undefined)
    return NextResponse.json(summary)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
