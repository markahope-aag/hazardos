import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

export async function POST(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { id } = await _params
    const body = await request.json()

    validateRequired(body.hazard_type, 'hazard_type')
    if (body.quantity === undefined || body.quantity === null) {
      throw new SecureError('VALIDATION_ERROR', 'quantity is required')
    }
    validateRequired(body.unit, 'unit')

    const disposal = await JobsService.addDisposal(id, body)

    return NextResponse.json(disposal, { status: 201 })
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
    const { disposal_id, ...updates } = body

    validateRequired(disposal_id, 'disposal_id')

    const disposal = await JobsService.updateDisposal(disposal_id, updates)

    return NextResponse.json(disposal)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { disposal_id } = await request.json()

    validateRequired(disposal_id, 'disposal_id')

    await JobsService.deleteDisposal(disposal_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
