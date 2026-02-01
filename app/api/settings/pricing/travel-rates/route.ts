import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import {
  createTravelRateSchema,
  updateTravelRateSchema,
  deleteTravelRateQuerySchema,
} from '@/lib/validations/settings'

/**
 * GET /api/settings/pricing/travel-rates
 * List travel rates
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('travel_rates')
      .select('id, organization_id, min_miles, max_miles, flat_fee, per_mile_rate, description, is_active, created_at, updated_at')
      .order('min_miles')

    if (error) throw error

    return NextResponse.json({ travel_rates: data })
  }
)

/**
 * POST /api/settings/pricing/travel-rates
 * Create a travel rate
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createTravelRateSchema,
    allowedRoles: ['admin', 'tenant_owner'],
  },
  async (_request, context, body) => {
    const { data, error } = await context.supabase
      .from('travel_rates')
      .insert({
        organization_id: context.profile.organization_id,
        min_miles: body.min_miles,
        max_miles: body.max_miles || null,
        flat_fee: body.flat_fee || null,
        per_mile_rate: body.per_mile_rate || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  }
)

/**
 * PATCH /api/settings/pricing/travel-rates
 * Update a travel rate
 */
export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: updateTravelRateSchema,
    allowedRoles: ['admin', 'tenant_owner'],
  },
  async (_request, context, body) => {
    const { id, ...updateData } = body

    const { data, error } = await context.supabase
      .from('travel_rates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  }
)

/**
 * DELETE /api/settings/pricing/travel-rates
 * Delete a travel rate
 */
export const DELETE = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: deleteTravelRateQuerySchema,
    allowedRoles: ['admin', 'tenant_owner'],
  },
  async (_request, context, _body, query) => {
    const { error } = await context.supabase
      .from('travel_rates')
      .delete()
      .eq('id', query.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  }
)
