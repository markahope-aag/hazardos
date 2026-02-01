import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function POST(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await _params
    const body = await request.json()

    if (!body.hazard_type) {
      return NextResponse.json({ error: 'hazard_type is required' }, { status: 400 })
    }
    if (body.quantity === undefined || body.quantity === null) {
      return NextResponse.json({ error: 'quantity is required' }, { status: 400 })
    }
    if (!body.unit) {
      return NextResponse.json({ error: 'unit is required' }, { status: 400 })
    }

    const disposal = await JobsService.addDisposal(id, body)

    return NextResponse.json(disposal, { status: 201 })
  } catch (error) {
    console.error('Add disposal error:', error)
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
    const { disposal_id, ...updates } = body

    if (!disposal_id) {
      return NextResponse.json({ error: 'disposal_id is required' }, { status: 400 })
    }

    const disposal = await JobsService.updateDisposal(disposal_id, updates)

    return NextResponse.json(disposal)
  } catch (error) {
    console.error('Update disposal error:', error)
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { disposal_id } = await request.json()

    if (!disposal_id) {
      return NextResponse.json({ error: 'disposal_id is required' }, { status: 400 })
    }

    await JobsService.deleteDisposal(disposal_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete disposal error:', error)
    return createSecureErrorResponse(error)
  }
}
