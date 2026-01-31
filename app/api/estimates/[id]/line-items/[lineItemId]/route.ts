import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateLineItemInput } from '@/types/estimates'

interface RouteParams {
  params: Promise<{ id: string; lineItemId: string }>
}

/**
 * PATCH /api/estimates/[id]/line-items/[lineItemId]
 * Update a single line item
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, lineItemId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify estimate belongs to organization
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (estimateError || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // Check if estimate can be modified
    if (!['draft', 'pending_approval'].includes(estimate.status)) {
      return NextResponse.json({
        error: 'Cannot modify line items for an estimate in this status'
      }, { status: 400 })
    }

    // Get existing line item
    const { data: existing, error: existingError } = await supabase
      .from('estimate_line_items')
      .select('*')
      .eq('id', lineItemId)
      .eq('estimate_id', id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
    }

    // Parse request body
    const body: UpdateLineItemInput = await request.json()

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (body.item_type !== undefined) updateData.item_type = body.item_type
    if (body.category !== undefined) updateData.category = body.category
    if (body.description !== undefined) updateData.description = body.description
    if (body.quantity !== undefined) updateData.quantity = body.quantity
    if (body.unit !== undefined) updateData.unit = body.unit
    if (body.unit_price !== undefined) updateData.unit_price = body.unit_price
    if (body.is_optional !== undefined) updateData.is_optional = body.is_optional
    if (body.is_included !== undefined) updateData.is_included = body.is_included
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order

    // Recalculate total price
    const qty = body.quantity ?? existing.quantity
    const price = body.unit_price ?? existing.unit_price
    updateData.total_price = qty * price

    // Update the line item
    const { data: lineItem, error: updateError } = await supabase
      .from('estimate_line_items')
      .update(updateData)
      .eq('id', lineItemId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating line item:', updateError)
      return NextResponse.json({ error: 'Failed to update line item' }, { status: 500 })
    }

    return NextResponse.json({ line_item: lineItem })
  } catch (error) {
    console.error('Error in PATCH /api/estimates/[id]/line-items/[lineItemId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/estimates/[id]/line-items/[lineItemId]
 * Delete a line item
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, lineItemId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify estimate belongs to organization
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (estimateError || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // Check if estimate can be modified
    if (!['draft', 'pending_approval'].includes(estimate.status)) {
      return NextResponse.json({
        error: 'Cannot modify line items for an estimate in this status'
      }, { status: 400 })
    }

    // Delete the line item
    const { error: deleteError } = await supabase
      .from('estimate_line_items')
      .delete()
      .eq('id', lineItemId)
      .eq('estimate_id', id)

    if (deleteError) {
      console.error('Error deleting line item:', deleteError)
      return NextResponse.json({ error: 'Failed to delete line item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/estimates/[id]/line-items/[lineItemId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
