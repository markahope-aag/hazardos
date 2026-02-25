import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import {
  createMaterialCostSchema,
  updateMaterialCostSchema,
  deleteMaterialCostQuerySchema,
} from '@/lib/validations/settings'

/**
 * GET /api/settings/pricing/material-costs
 * List material costs
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('material_costs')
      .select('id, organization_id, name, cost_per_unit, unit, description, created_at, updated_at')
      .order('name')

    if (error) throw error

    return NextResponse.json({ material_costs: data })
  }
)

/**
 * POST /api/settings/pricing/material-costs
 * Create a material cost
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createMaterialCostSchema,
    allowedRoles: ['admin', 'tenant_owner'],
  },
  async (_request, context, body) => {
    const { data, error } = await context.supabase
      .from('material_costs')
      .insert({
        organization_id: context.profile.organization_id,
        name: body.name,
        cost_per_unit: body.cost_per_unit,
        unit: body.unit,
        description: body.description || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  }
)

/**
 * PATCH /api/settings/pricing/material-costs
 * Update a material cost
 */
export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: updateMaterialCostSchema,
    allowedRoles: ['admin', 'tenant_owner'],
  },
  async (_request, context, body) => {
    const { id, ...updateData } = body

    const { data, error } = await context.supabase
      .from('material_costs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  }
)

/**
 * DELETE /api/settings/pricing/material-costs
 * Delete a material cost
 */
export const DELETE = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: deleteMaterialCostQuerySchema,
    allowedRoles: ['admin', 'tenant_owner'],
  },
  async (_request, context, _body, query) => {
    const { error } = await context.supabase
      .from('material_costs')
      .delete()
      .eq('id', query.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  }
)
