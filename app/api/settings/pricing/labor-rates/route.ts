import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

// GET - List all labor rates
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { data: laborRates, error } = await supabase
      .from('labor_rates')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name')

    if (error) {
      throw error
    }

    return NextResponse.json({ labor_rates: laborRates })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

// POST - Create a new labor rate
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

    // If setting as default, unset other defaults first
    if (body.is_default) {
      await supabase
        .from('labor_rates')
        .update({ is_default: false })
        .eq('organization_id', profile.organization_id)
    }

    const { data: laborRate, error } = await supabase
      .from('labor_rates')
      .insert({
        organization_id: profile.organization_id,
        name: body.name,
        rate_per_hour: body.rate_per_hour,
        description: body.description || null,
        is_default: body.is_default || false,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(laborRate, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

// PATCH - Update a labor rate
export async function PATCH(request: NextRequest) {
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
    const { id, ...updateData } = body

    validateRequired(id, 'id')

    // If setting as default, unset other defaults first
    if (updateData.is_default) {
      await supabase
        .from('labor_rates')
        .update({ is_default: false })
        .eq('organization_id', profile.organization_id)
        .neq('id', id)
    }

    const { data: laborRate, error } = await supabase
      .from('labor_rates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(laborRate)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

// DELETE - Delete a labor rate
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
      .from('labor_rates')
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
