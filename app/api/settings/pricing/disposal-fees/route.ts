import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createDisposalFeeSchema, updateDisposalFeeSchema, deleteDisposalFeeQuerySchema } from '@/lib/validations/settings'

const adminRoles = ['platform_owner', 'platform_admin', 'tenant_owner', 'admin']

/**
 * GET /api/settings/pricing/disposal-fees
 * List all disposal fees
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
  },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('disposal_fees')
      .select('id, organization_id, hazard_type, unit_cost, cost_per_cubic_yard, unit_type, description, is_active, created_at, updated_at')
      .order('hazard_type')

    if (error) {
      throw error
    }

    return NextResponse.json({ disposal_fees: data })
  }
)

/**
 * POST /api/settings/pricing/disposal-fees
 * Create a new disposal fee
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createDisposalFeeSchema,
    allowedRoles: adminRoles,
  },
  async (_request, context, body) => {
    const { data, error } = await context.supabase
      .from('disposal_fees')
      .insert({
        organization_id: context.profile.organization_id,
        hazard_type: body.hazard_type,
        cost_per_cubic_yard: body.cost_per_cubic_yard,
        description: body.description || null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  }
)

/**
 * PATCH /api/settings/pricing/disposal-fees
 * Update a disposal fee
 */
export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: updateDisposalFeeSchema,
    allowedRoles: adminRoles,
  },
  async (_request, context, body) => {
    const { id, ...updateData } = body

    const { data, error } = await context.supabase
      .from('disposal_fees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  }
)

/**
 * DELETE /api/settings/pricing/disposal-fees
 * Delete a disposal fee
 */
export const DELETE = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: deleteDisposalFeeQuerySchema,
    allowedRoles: adminRoles,
  },
  async (_request, context, _body, query) => {
    const { error } = await context.supabase
      .from('disposal_fees')
      .delete()
      .eq('id', query.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  }
)
