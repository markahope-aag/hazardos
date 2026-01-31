import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateEstimateInput } from '@/types/estimates'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/estimates/[id]
 * Get a single estimate with all relations
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get estimate with relations
    const { data: estimate, error } = await supabase
      .from('estimates')
      .select(`
        *,
        site_survey:site_surveys(id, job_name, site_address, site_city, site_state, site_zip, hazard_type, status, customer_name),
        customer:customers(id, company_name, first_name, last_name, email, phone),
        created_by_user:profiles!created_by(id, first_name, last_name, email),
        approved_by_user:profiles!approved_by(id, first_name, last_name, email),
        line_items:estimate_line_items(*)
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
      }
      console.error('Error fetching estimate:', error)
      return NextResponse.json({ error: 'Failed to fetch estimate' }, { status: 500 })
    }

    // Transform relations
    const transformedEstimate = {
      ...estimate,
      site_survey: Array.isArray(estimate.site_survey) ? estimate.site_survey[0] : estimate.site_survey,
      customer: Array.isArray(estimate.customer) ? estimate.customer[0] : estimate.customer,
      created_by_user: Array.isArray(estimate.created_by_user) ? estimate.created_by_user[0] : estimate.created_by_user,
      approved_by_user: Array.isArray(estimate.approved_by_user) ? estimate.approved_by_user[0] : estimate.approved_by_user,
      line_items: estimate.line_items || [],
    }

    // Sort line items by sort_order
    if (transformedEstimate.line_items) {
      transformedEstimate.line_items.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    }

    return NextResponse.json({ estimate: transformedEstimate })
  } catch (error) {
    console.error('Error in GET /api/estimates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/estimates/[id]
 * Update an estimate
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse request body
    const body: UpdateEstimateInput = await request.json()

    // Check estimate exists and belongs to organization
    const { data: existing, error: existingError } = await supabase
      .from('estimates')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (body.project_name !== undefined) updateData.project_name = body.project_name
    if (body.project_description !== undefined) updateData.project_description = body.project_description
    if (body.scope_of_work !== undefined) updateData.scope_of_work = body.scope_of_work
    if (body.estimated_duration_days !== undefined) updateData.estimated_duration_days = body.estimated_duration_days
    if (body.estimated_start_date !== undefined) updateData.estimated_start_date = body.estimated_start_date
    if (body.estimated_end_date !== undefined) updateData.estimated_end_date = body.estimated_end_date
    if (body.valid_until !== undefined) updateData.valid_until = body.valid_until
    if (body.markup_percent !== undefined) updateData.markup_percent = body.markup_percent
    if (body.discount_percent !== undefined) updateData.discount_percent = body.discount_percent
    if (body.tax_percent !== undefined) updateData.tax_percent = body.tax_percent
    if (body.internal_notes !== undefined) updateData.internal_notes = body.internal_notes
    if (body.status !== undefined) updateData.status = body.status

    // Update the estimate
    const { data: estimate, error: updateError } = await supabase
      .from('estimates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating estimate:', updateError)
      return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 })
    }

    return NextResponse.json({ estimate })
  } catch (error) {
    console.error('Error in PATCH /api/estimates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/estimates/[id]
 * Delete an estimate
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user has permission to delete
    const canDelete = ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'].includes(profile.role)
    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Delete the estimate (cascade will delete line items)
    const { error: deleteError } = await supabase
      .from('estimates')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (deleteError) {
      console.error('Error deleting estimate:', deleteError)
      return NextResponse.json({ error: 'Failed to delete estimate' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/estimates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
