import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

// GET - Fetch all pricing data for the organization
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    // Fetch all pricing data in parallel
    const [
      laborRatesResult,
      equipmentRatesResult,
      materialCostsResult,
      disposalFeesResult,
      travelRatesResult,
      settingsResult,
    ] = await Promise.all([
      supabase.from('labor_rates').select('*').order('name'),
      supabase.from('equipment_rates').select('*').order('name'),
      supabase.from('material_costs').select('*').order('name'),
      supabase.from('disposal_fees').select('*').order('hazard_type'),
      supabase.from('travel_rates').select('*').order('min_miles'),
      supabase.from('pricing_settings').select('*').single(),
    ])

    return NextResponse.json({
      labor_rates: laborRatesResult.data || [],
      equipment_rates: equipmentRatesResult.data || [],
      material_costs: materialCostsResult.data || [],
      disposal_fees: disposalFeesResult.data || [],
      travel_rates: travelRatesResult.data || [],
      settings: settingsResult.data || null,
    })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

// PATCH - Update general pricing settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'tenant_owner'].includes(profile.role)) {
      throw new SecureError('FORBIDDEN')
    }

    const body = await request.json()

    // Upsert pricing settings
    const { data: settings, error } = await supabase
      .from('pricing_settings')
      .upsert({
        organization_id: profile.organization_id,
        ...body,
      }, {
        onConflict: 'organization_id',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(settings)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
