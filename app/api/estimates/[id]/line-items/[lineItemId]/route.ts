import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateLineItemSchema } from '@/lib/validations/estimates'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * PATCH /api/estimates/[id]/line-items/[lineItemId]
 * Update a single line item
 */
export const PATCH = createApiHandlerWithParams<
  typeof updateLineItemSchema._type,
  unknown,
  { id: string; lineItemId: string }
>(
  {
    rateLimit: 'general',
    bodySchema: updateLineItemSchema,
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
    if (!['draft', 'pending_approval'].includes(estimate.status)) {
      throw new SecureError('VALIDATION_ERROR', 'Cannot modify line items for an estimate in this status')
    }

    // Get existing line item
    const { data: existing, error: existingError } = await context.supabase
      .from('estimate_line_items')
      .select('id, quantity, unit_price')
      .eq('id', params.lineItemId)
      .eq('estimate_id', params.id)
      .single()

    if (existingError || !existing) {
      throw new SecureError('NOT_FOUND', 'Line item not found')
    }

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
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order

    // Recalculate total price
    const qty = body.quantity ?? existing.quantity
    const price = body.unit_price ?? existing.unit_price
    updateData.total_price = qty * price

    // Update the line item
    const { data: lineItem, error: updateError } = await context.supabase
      .from('estimate_line_items')
      .update(updateData)
      .eq('id', params.lineItemId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ line_item: lineItem })
  }
)

/**
 * DELETE /api/estimates/[id]/line-items/[lineItemId]
 * Delete a line item
 */
export const DELETE = createApiHandlerWithParams<
  unknown,
  unknown,
  { id: string; lineItemId: string }
>(
  { rateLimit: 'general' },
  async (_request, context, params) => {
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
    if (!['draft', 'pending_approval'].includes(estimate.status)) {
      throw new SecureError('VALIDATION_ERROR', 'Cannot modify line items for an estimate in this status')
    }

    // Delete the line item
    const { error: deleteError } = await context.supabase
      .from('estimate_line_items')
      .delete()
      .eq('id', params.lineItemId)
      .eq('estimate_id', params.id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  }
)
