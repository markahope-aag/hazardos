import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateLineItemInput, UpdateLineItemInput } from '@/types/estimates'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/estimates/[id]/line-items
 * Get all line items for an estimate
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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify estimate belongs to organization
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (estimateError || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // Get line items
    const { data: lineItems, error } = await supabase
      .from('estimate_line_items')
      .select('*')
      .eq('estimate_id', id)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching line items:', error)
      return NextResponse.json({ error: 'Failed to fetch line items' }, { status: 500 })
    }

    return NextResponse.json({ line_items: lineItems || [] })
  } catch (error) {
    console.error('Error in GET /api/estimates/[id]/line-items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/estimates/[id]/line-items
 * Add a new line item to an estimate
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Parse request body
    const body: CreateLineItemInput = await request.json()

    if (!body.item_type || !body.description || body.unit_price === undefined) {
      return NextResponse.json({
        error: 'item_type, description, and unit_price are required'
      }, { status: 400 })
    }

    // Get max sort order
    const { data: maxOrder } = await supabase
      .from('estimate_line_items')
      .select('sort_order')
      .eq('estimate_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const newSortOrder = body.sort_order ?? ((maxOrder?.sort_order ?? -1) + 1)

    // Calculate total price
    const quantity = body.quantity ?? 1
    const totalPrice = quantity * body.unit_price

    // Create line item
    const { data: lineItem, error: createError } = await supabase
      .from('estimate_line_items')
      .insert({
        estimate_id: id,
        item_type: body.item_type,
        category: body.category,
        description: body.description,
        quantity,
        unit: body.unit || 'each',
        unit_price: body.unit_price,
        total_price: totalPrice,
        sort_order: newSortOrder,
        is_optional: body.is_optional ?? false,
        is_included: body.is_included ?? true,
        notes: body.notes,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating line item:', createError)
      return NextResponse.json({ error: 'Failed to create line item' }, { status: 500 })
    }

    return NextResponse.json({ line_item: lineItem }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/estimates/[id]/line-items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/estimates/[id]/line-items
 * Bulk update line items (for reordering or batch updates)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Parse request body
    const body: { line_items: (UpdateLineItemInput & { id: string })[] } = await request.json()

    if (!Array.isArray(body.line_items)) {
      return NextResponse.json({ error: 'line_items array is required' }, { status: 400 })
    }

    // Update each line item
    const updates = body.line_items.map(async (item, index) => {
      const updateData: Record<string, unknown> = {}

      if (item.item_type !== undefined) updateData.item_type = item.item_type
      if (item.category !== undefined) updateData.category = item.category
      if (item.description !== undefined) updateData.description = item.description
      if (item.quantity !== undefined) updateData.quantity = item.quantity
      if (item.unit !== undefined) updateData.unit = item.unit
      if (item.unit_price !== undefined) updateData.unit_price = item.unit_price
      if (item.is_optional !== undefined) updateData.is_optional = item.is_optional
      if (item.is_included !== undefined) updateData.is_included = item.is_included
      if (item.notes !== undefined) updateData.notes = item.notes
      if (item.sort_order !== undefined) {
        updateData.sort_order = item.sort_order
      } else {
        updateData.sort_order = index
      }

      // Recalculate total if quantity or unit_price changed
      if (item.quantity !== undefined || item.unit_price !== undefined) {
        const { data: existing } = await supabase
          .from('estimate_line_items')
          .select('quantity, unit_price')
          .eq('id', item.id)
          .single()

        const qty = item.quantity ?? existing?.quantity ?? 1
        const price = item.unit_price ?? existing?.unit_price ?? 0
        updateData.total_price = qty * price
      }

      return supabase
        .from('estimate_line_items')
        .update(updateData)
        .eq('id', item.id)
        .eq('estimate_id', id)
    })

    await Promise.all(updates)

    // Fetch updated line items
    const { data: lineItems, error: fetchError } = await supabase
      .from('estimate_line_items')
      .select('*')
      .eq('estimate_id', id)
      .order('sort_order', { ascending: true })

    if (fetchError) {
      console.error('Error fetching updated line items:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch updated line items' }, { status: 500 })
    }

    return NextResponse.json({ line_items: lineItems || [] })
  } catch (error) {
    console.error('Error in PUT /api/estimates/[id]/line-items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
