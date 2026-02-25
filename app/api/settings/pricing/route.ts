import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { updatePricingSettingsSchema } from '@/lib/validations/settings'

/**
 * GET /api/settings/pricing
 * Get all pricing data for the organization
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const [
      laborRatesResult,
      equipmentRatesResult,
      materialCostsResult,
      disposalFeesResult,
      travelRatesResult,
      settingsResult,
    ] = await Promise.all([
      context.supabase.from('labor_rates').select('id, organization_id, name, rate_per_hour, description, is_default, created_at, updated_at').order('name'),
      context.supabase.from('equipment_rates').select('id, organization_id, name, rate_per_day, description, created_at, updated_at').order('name'),
      context.supabase.from('material_costs').select('id, organization_id, name, cost_per_unit, unit, description, created_at, updated_at').order('name'),
      context.supabase.from('disposal_fees').select('id, organization_id, hazard_type, cost_per_cubic_yard, description, created_at, updated_at').order('hazard_type'),
      context.supabase.from('travel_rates').select('id, organization_id, min_miles, max_miles, flat_fee, per_mile_rate, created_at, updated_at').order('min_miles'),
      context.supabase.from('pricing_settings').select('id, organization_id, default_markup_percent, minimum_markup_percent, maximum_markup_percent, office_address_line1, office_city, office_state, office_zip, created_at, updated_at').single(),
    ])

    return NextResponse.json({
      labor_rates: laborRatesResult.data || [],
      equipment_rates: equipmentRatesResult.data || [],
      material_costs: materialCostsResult.data || [],
      disposal_fees: disposalFeesResult.data || [],
      travel_rates: travelRatesResult.data || [],
      settings: settingsResult.data || null,
    })
  }
)

/**
 * PATCH /api/settings/pricing
 * Update general pricing settings
 */
export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: updatePricingSettingsSchema,
    allowedRoles: ['admin', 'tenant_owner'],
  },
  async (_request, context, body) => {
    const { data: settings, error } = await context.supabase
      .from('pricing_settings')
      .upsert({
        organization_id: context.profile.organization_id,
        ...body,
      }, {
        onConflict: 'organization_id',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(settings)
  }
)
