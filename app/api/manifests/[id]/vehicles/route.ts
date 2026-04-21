import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { manifestVehicleSchema } from '@/lib/validations/manifests'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/manifests/[id]/vehicles
 * Attach a vehicle (truck, trailer, van, rental) to a draft manifest.
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_MANAGE,
    bodySchema: manifestVehicleSchema,
  },
  async (_request, context, params, body) => {
    const { data: manifest } = await context.supabase
      .from('manifests')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (!manifest) throw new SecureError('NOT_FOUND', 'Manifest not found')
    if (manifest.status === 'issued') {
      throw new SecureError(
        'VALIDATION_ERROR',
        'Issued manifests are locked. Create a new manifest to add a vehicle.',
      )
    }

    const { data, error } = await context.supabase
      .from('manifest_vehicles')
      .insert({
        manifest_id: params.id,
        vehicle_type: body.vehicle_type ?? null,
        make_model: body.make_model ?? null,
        plate: body.plate ?? null,
        driver_profile_id: body.driver_profile_id ?? null,
        driver_name: body.driver_name ?? null,
        is_rental: body.is_rental ?? false,
        rental_vendor: body.rental_vendor ?? null,
        rental_rate_daily: body.rental_rate_daily ?? null,
        rental_start_date: body.rental_start_date ?? null,
        rental_end_date: body.rental_end_date ?? null,
        notes: body.notes ?? null,
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single()

    if (error) throwDbError(error, 'add vehicle')

    return NextResponse.json({ vehicle: data }, { status: 201 })
  },
)
