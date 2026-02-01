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

    if (!body.equipment_name) {
      return NextResponse.json({ error: 'equipment_name is required' }, { status: 400 })
    }

    const equipment = await JobsService.addEquipment(id, body)

    return NextResponse.json(equipment, { status: 201 })
  } catch (error) {
    console.error('Add equipment error:', error)
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
    const { equipment_id, status } = body

    if (!equipment_id) {
      return NextResponse.json({ error: 'equipment_id is required' }, { status: 400 })
    }

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const equipment = await JobsService.updateEquipmentStatus(equipment_id, status)

    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Update equipment error:', error)
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

    const { equipment_id } = await request.json()

    if (!equipment_id) {
      return NextResponse.json({ error: 'equipment_id is required' }, { status: 400 })
    }

    await JobsService.deleteEquipment(equipment_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete equipment error:', error)
    return createSecureErrorResponse(error)
  }
}
