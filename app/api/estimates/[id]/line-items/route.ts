import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { addLineItemSchema, bulkUpdateLineItemsSchema } from '@/lib/validations/estimates'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/estimates/[id]/line-items
 * Get all line items for an estimate
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, context, params) => {
    // Verify estimate belongs to organization
    const { data: estimate, error: estimateError } = await context.supabase
      .from('estimates')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (estimateError || !estimate) {
      throw new SecureError('NOT_FOUND', 'Estimate not found')
    }

    // Get line items
    const { data: lineItems, error } = await context.supabase
      .from('estimate_line_items')
      .select('id, estimate_id, item_type, category, description, quantity, unit, unit_price, total_price, source_rate_id, source_table, sort_order, is_optional, is_included, notes, created_at, updated_at')
      .eq('estimate_id', params.id)
      .order('sort_order', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ line_items: lineItems || [] })
  }
)

/**
 * POST /api/estimates/[id]/line-items
 * Add a new line item to an estimate
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: addLineItemSchema,
  },
  async (_request, context, params, body) => {
    // Verify estimate belongs to organization
    const { data: estimate, error: estimateError } = await context.supabase
      .from('estimates')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (estimateError || !estimate) {
      throw new SecureError('NOT_FOUND', 'Estimate not found')
    }

    // Check if estimate can be modified
    if (!['draft', 'pending_review'].includes(estimate.status)) {
      throw new SecureError('VALIDATION_ERROR', 'Cannot modify line items for an estimate in this status')
    }

    // Get max sort order
    const { data: maxOrder } = await context.supabase
      .from('estimate_line_items')
      .select('sort_order')
      .eq('estimate_id', params.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const newSortOrder = body.sort_order ?? ((maxOrder?.sort_order ?? -1) + 1)

    // Calculate total price
    const totalPrice = body.quantity * body.unit_price

    // Create line item
    const { data: lineItem, error: createError } = await context.supabase
      .from('estimate_line_items')
      .insert({
        estimate_id: params.id,
        item_type: body.item_type,
        category: body.category,
        description: body.description,
        quantity: body.quantity,
        unit: body.unit || 'each',
        unit_price: body.unit_price,
        total_price: totalPrice,
        sort_order: newSortOrder,
        is_optional: body.is_optional,
        is_included: body.is_included,
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return NextResponse.json({ line_item: lineItem }, { status: 201 })
  }
)

/**
 * PUT /api/estimates/[id]/line-items
 * Bulk update line items (for reordering or batch updates)
 */
export const PUT = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: bulkUpdateLineItemsSchema,
  },
  async (_request, context, params, body) => {
    // Verify estimate belongs to organization
    const { data: estimate, error: estimateError } = await context.supabase
      .from('estimates')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (estimateError || !estimate) {
      throw new SecureError('NOT_FOUND', 'Estimate not found')
    }

    // Check if estimate can be modified
    if (!['draft', 'pending_review'].includes(estimate.status)) {
      throw new SecureError('VALIDATION_ERROR', 'Cannot modify line items for an estimate in this status')
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
        const { data: existing } = await context.supabase
          .from('estimate_line_items')
          .select('quantity, unit_price')
          .eq('id', item.id)
          .single()

        const qty = item.quantity ?? existing?.quantity ?? 1
        const price = item.unit_price ?? existing?.unit_price ?? 0
        updateData.total_price = qty * price
      }

      return context.supabase
        .from('estimate_line_items')
        .update(updateData)
        .eq('id', item.id)
        .eq('estimate_id', params.id)
    })

    await Promise.all(updates)

    // Fetch updated line items
    const { data: lineItems, error: fetchError } = await context.supabase
      .from('estimate_line_items')
      .select('id, estimate_id, item_type, category, description, quantity, unit, unit_price, total_price, source_rate_id, source_table, sort_order, is_optional, is_included, notes, created_at, updated_at')
      .eq('estimate_id', params.id)
      .order('sort_order', { ascending: true })

    if (fetchError) {
      throw fetchError
    }

    return NextResponse.json({ line_items: lineItems || [] })
  }
)
