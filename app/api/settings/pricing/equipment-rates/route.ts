import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import {
  createEquipmentRateSchema,
  updateEquipmentRateSchema,
  deleteEquipmentRateQuerySchema,
} from '@/lib/validations/settings'

/**
 * GET /api/settings/pricing/equipment-rates
 * List equipment rates
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('equipment_rates')
      .select('id, organization_id, name, equipment_name, daily_rate, weekly_rate, monthly_rate, rate_per_day, description, is_active, created_at, updated_at')
      .order('name')

    if (error) throw error

    return NextResponse.json({ equipment_rates: data })
  }
)

/**
 * POST /api/settings/pricing/equipment-rates
 * Create an equipment rate
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createEquipmentRateSchema,
    allowedRoles: ['admin', 'tenant_owner'],
  },
  async (_request, context, body) => {
    const { data, error } = await context.supabase
      .from('equipment_rates')
      .insert({
        organization_id: context.profile.organization_id,
        name: body.name,
        rate_per_day: body.rate_per_day,
        description: body.description || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  }
)

/**
 * PATCH /api/settings/pricing/equipment-rates
 * Update an equipment rate
 */
export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: updateEquipmentRateSchema,
    allowedRoles: ['admin', 'tenant_owner'],
  },
  async (_request, context, body) => {
    const { id, ...updateData } = body

    const { data, error } = await context.supabase
      .from('equipment_rates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  }
)

/**
 * DELETE /api/settings/pricing/equipment-rates
 * Delete an equipment rate
 */
export const DELETE = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: deleteEquipmentRateQuerySchema,
    allowedRoles: ['admin', 'tenant_owner'],
  },
  async (_request, context, _body, query) => {
    const { error } = await context.supabase
      .from('equipment_rates')
      .delete()
      .eq('id', query.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  }
)
