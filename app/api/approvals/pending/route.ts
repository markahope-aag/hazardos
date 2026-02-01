import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApprovalService } from '@/lib/services/approval-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const requests = await ApprovalService.getMyPendingApprovals()
    return NextResponse.json(requests)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
