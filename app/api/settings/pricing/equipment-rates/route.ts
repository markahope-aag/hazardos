import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { data, error } = await supabase
      .from('equipment_rates')
      .select('*')
      .order('name')

    if (error) {
      throw error
    }

    return NextResponse.json({ equipment_rates: data })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'tenant_owner'].includes(profile.role)) {
      throw new SecureError('FORBIDDEN')
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
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'tenant_owner'].includes(profile.role)) {
      throw new SecureError('FORBIDDEN')
    }

    const body = await request.json()
    const { id, ...updateData } = body

    validateRequired(id, 'id')

    const { data, error } = await supabase
      .from('equipment_rates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'tenant_owner'].includes(profile.role)) {
      throw new SecureError('FORBIDDEN')
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new SecureError('VALIDATION_ERROR', 'ID is required')
    }

    const { error } = await supabase
      .from('equipment_rates')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
