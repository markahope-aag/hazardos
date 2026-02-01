import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    if (!body.description) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }

    if (body.amount === undefined || body.amount === null) {
      return NextResponse.json({ error: 'amount is required' }, { status: 400 })
    }

    const changeOrder = await JobsService.addChangeOrder(id, {
      description: body.description,
      reason: body.reason,
      amount: body.amount,
    })

    return NextResponse.json(changeOrder, { status: 201 })
  } catch (error) {
    console.error('Add change order error:', error)
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { change_order_id, action } = body

    if (!change_order_id) {
      return NextResponse.json({ error: 'change_order_id is required' }, { status: 400 })
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const changeOrder = action === 'approve'
      ? await JobsService.approveChangeOrder(change_order_id)
      : await JobsService.rejectChangeOrder(change_order_id)

    return NextResponse.json(changeOrder)
  } catch (error) {
    console.error('Update change order error:', error)
    return createSecureErrorResponse(error)
  }
}
