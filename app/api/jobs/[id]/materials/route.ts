import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'

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

    if (!body.material_name) {
      return NextResponse.json({ error: 'material_name is required' }, { status: 400 })
    }

    const material = await JobsService.addMaterial(id, body)

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('Add material error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add material' },
      { status: 500 }
    )
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
    const { material_id, quantity_used } = body

    if (!material_id) {
      return NextResponse.json({ error: 'material_id is required' }, { status: 400 })
    }

    if (quantity_used === undefined || quantity_used === null) {
      return NextResponse.json({ error: 'quantity_used is required' }, { status: 400 })
    }

    const material = await JobsService.updateMaterialUsage(material_id, quantity_used)

    return NextResponse.json(material)
  } catch (error) {
    console.error('Update material error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update material' },
      { status: 500 }
    )
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

    const { material_id } = await request.json()

    if (!material_id) {
      return NextResponse.json({ error: 'material_id is required' }, { status: 400 })
    }

    await JobsService.deleteMaterial(material_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete material error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete material' },
      { status: 500 }
    )
  }
}
