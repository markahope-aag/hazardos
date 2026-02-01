import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApprovalService } from '@/lib/services/approval-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { id } = await params
    const approvalRequest = await ApprovalService.getRequest(id)

    if (!approvalRequest) {
      throw new SecureError('NOT_FOUND', 'Approval request not found')
    }

    return NextResponse.json(approvalRequest)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { id } = await params
    const body = await request.json()
    const { level, approved, notes } = body

    if (level !== 1 && level !== 2) {
      throw new SecureError('VALIDATION_ERROR', 'level must be 1 or 2')
    }
    if (typeof approved !== 'boolean') {
      throw new SecureError('VALIDATION_ERROR', 'approved must be a boolean')
    }

    let result

    if (level === 1) {
      result = await ApprovalService.decideLevel1(id, { approved, notes })
    } else {
      result = await ApprovalService.decideLevel2(id, { approved, notes })
    }

    return NextResponse.json(result)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
