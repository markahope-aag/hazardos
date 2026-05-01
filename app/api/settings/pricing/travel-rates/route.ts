import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import {
  createTravelRateSchema,
  updateTravelRateSchema,
  deleteTravelRateQuerySchema,
} from '@/lib/validations/settings'
import { ROLES } from '@/lib/auth/roles'

/**
 * GET /api/settings/pricing/travel-rates
 * List travel rates
 */
export const GET = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('travel_rates')
      .select('id, organization_id, min_miles, max_miles, flat_fee, per_mile_rate, created_at, updated_at')
      .order('min_miles')

    if (error) throwDbError(error, 'fetch travel rates')

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
    allowedRoles: ROLES.TENANT_ADMIN,
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

    if (error) throwDbError(error, 'create travel rate')

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
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, context, body) => {
    const { id, ...updateData } = body

    const { data, error } = await context.supabase
      .from('travel_rates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throwDbError(error, 'update travel rate')

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
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, context, _body, query) => {
    const { error } = await context.supabase
      .from('travel_rates')
      .delete()
      .eq('id', query.id)

    if (error) throwDbError(error, 'delete travel rate')

    return NextResponse.json({ success: true })
  }
)
