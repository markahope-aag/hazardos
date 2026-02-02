import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createLaborRateSchema, updateLaborRateSchema, deleteLaborRateQuerySchema } from '@/lib/validations/settings'

const adminRoles = ['platform_owner', 'platform_admin', 'tenant_owner', 'admin']

/**
 * GET /api/settings/pricing/labor-rates
 * List all labor rates
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
  },
  async (_request, context) => {
    const { data: laborRates, error } = await context.supabase
      .from('labor_rates')
      .select('id, organization_id, name, role_title, hourly_rate, overtime_rate, description, is_active, is_default, created_at, updated_at')
      .order('is_default', { ascending: false })
      .order('name')

    if (error) {
      throw error
    }

    return NextResponse.json({ labor_rates: laborRates })
  }
)

/**
 * POST /api/settings/pricing/labor-rates
 * Create a new labor rate
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createLaborRateSchema,
    allowedRoles: adminRoles,
  },
  async (_request, context, body) => {
    // If setting as default, unset other defaults first
    if (body.is_default) {
      await context.supabase
        .from('labor_rates')
        .update({ is_default: false })
        .eq('organization_id', context.profile.organization_id)
    }

    const { data: laborRate, error } = await context.supabase
      .from('labor_rates')
      .insert({
        organization_id: context.profile.organization_id,
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
  }
)

/**
 * PATCH /api/settings/pricing/labor-rates
 * Update a labor rate
 */
export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: updateLaborRateSchema,
    allowedRoles: adminRoles,
  },
  async (_request, context, body) => {
    const { id, ...updateData } = body

    // If setting as default, unset other defaults first
    if (updateData.is_default) {
      await context.supabase
        .from('labor_rates')
        .update({ is_default: false })
        .eq('organization_id', context.profile.organization_id)
        .neq('id', id)
    }

    const { data: laborRate, error } = await context.supabase
      .from('labor_rates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(laborRate)
  }
)

/**
 * DELETE /api/settings/pricing/labor-rates
 * Delete a labor rate
 */
export const DELETE = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: deleteLaborRateQuerySchema,
    allowedRoles: adminRoles,
  },
  async (_request, context, _body, query) => {
    const { error } = await context.supabase
      .from('labor_rates')
      .delete()
      .eq('id', query.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  }
)
