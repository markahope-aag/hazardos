import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CustomersService } from '@/lib/supabase/customers'
import type { CustomerUpdate } from '@/types/database'

// GET /api/customers/[id] - Get a specific customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to verify organization access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get customer using the service (RLS will ensure organization access)
    const customer = await CustomersService.getCustomer(id)

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Error fetching customer:', error)
    if (error instanceof Error && error.message.includes('Failed to fetch customer')) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

// PATCH /api/customers/[id] - Update a customer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to verify organization access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    
    // Prepare update data (only include fields that are provided)
    const updateData: CustomerUpdate = {}
    
    if (body.name !== undefined) updateData.name = body.name
    if (body.company_name !== undefined) updateData.company_name = body.company_name
    if (body.email !== undefined) updateData.email = body.email
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.address_line1 !== undefined) updateData.address_line1 = body.address_line1
    if (body.address_line2 !== undefined) updateData.address_line2 = body.address_line2
    if (body.city !== undefined) updateData.city = body.city
    if (body.state !== undefined) updateData.state = body.state
    if (body.zip !== undefined) updateData.zip = body.zip
    if (body.status !== undefined) updateData.status = body.status
    if (body.source !== undefined) updateData.source = body.source
    if (body.communication_preferences !== undefined) updateData.communication_preferences = body.communication_preferences
    if (body.marketing_consent !== undefined) updateData.marketing_consent = body.marketing_consent
    if (body.marketing_consent_date !== undefined) updateData.marketing_consent_date = body.marketing_consent_date
    if (body.notes !== undefined) updateData.notes = body.notes

    // Update customer using the service (RLS will ensure organization access)
    const customer = await CustomersService.updateCustomer(id, updateData)

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Error updating customer:', error)
    if (error instanceof Error && error.message.includes('Failed to update customer')) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Delete a customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to verify organization access and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user has permission to delete (admin or tenant_owner)
    if (!['admin', 'tenant_owner', 'platform_owner'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete customer using the service (RLS will ensure organization access)
    await CustomersService.deleteCustomer(id)

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Error deleting customer:', error)
    if (error instanceof Error && error.message.includes('Failed to delete customer')) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}