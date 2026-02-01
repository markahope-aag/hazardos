import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('equipment_rates')
      .select('*')
      .order('name')

    if (error) {
      return createSecureErrorResponse(error)
    }

    return NextResponse.json({ equipment_rates: data })
  } catch (error) {
    console.error('Error fetching equipment rates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'tenant_owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('equipment_rates')
      .insert({
        organization_id: profile.organization_id,
        name: body.name,
        rate_per_day: body.rate_per_day,
        description: body.description || null,
      })
      .select()
      .single()

    if (error) {
      return createSecureErrorResponse(error)
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating equipment rate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'tenant_owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('equipment_rates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return createSecureErrorResponse(error)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating equipment rate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'tenant_owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('equipment_rates')
      .delete()
      .eq('id', id)

    if (error) {
      return createSecureErrorResponse(error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting equipment rate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
