import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApprovalService } from '@/lib/services/approval-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import type { ApprovalEntityType, ApprovalStatus } from '@/types/sales'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get('entity_type') as ApprovalEntityType | null
    const status = searchParams.get('status') as ApprovalStatus | null
    const pendingOnly = searchParams.get('pending_only') === 'true'

    const requests = await ApprovalService.getRequests({
      entity_type: entityType || undefined,
      status: status || undefined,
      pending_only: pendingOnly,
    })

    return NextResponse.json(requests)
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
    const { entity_type, entity_id, amount } = body

    if (!entity_type || !entity_id) {
      throw new SecureError('VALIDATION_ERROR', 'entity_type and entity_id are required')
    }

    const approvalRequest = await ApprovalService.createRequest({
      entity_type,
      entity_id,
      amount,
    })

    return NextResponse.json(approvalRequest)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
