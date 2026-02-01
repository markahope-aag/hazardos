import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { id } = await params
    const body = await request.json()

    validateRequired(body.description, 'description')
    if (body.amount === undefined || body.amount === null) {
      throw new SecureError('VALIDATION_ERROR', 'amount is required')
    }

    const changeOrder = await JobsService.addChangeOrder(id, {
      description: body.description,
      reason: body.reason,
      amount: body.amount,
    })

    return NextResponse.json(changeOrder, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()
    const { change_order_id, action } = body

    validateRequired(change_order_id, 'change_order_id')
    if (!action || !['approve', 'reject'].includes(action)) {
      throw new SecureError('VALIDATION_ERROR', 'action must be "approve" or "reject"')
    }

    const changeOrder = action === 'approve'
      ? await JobsService.approveChangeOrder(change_order_id)
      : await JobsService.rejectChangeOrder(change_order_id)

    return NextResponse.json(changeOrder)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
