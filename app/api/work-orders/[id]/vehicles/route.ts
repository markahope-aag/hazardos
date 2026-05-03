import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { workOrderVehicleSchema } from '@/lib/validations/work-orders'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/work-orders/[id]/vehicles
 * Attach a vehicle (truck, trailer, van, rental) to a draft work order.
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_MANAGE,
    bodySchema: workOrderVehicleSchema,
  },
  async (_request, context, params, body) => {
    const { data: workOrder } = await context.supabase
      .from('work_orders')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (!workOrder) throw new SecureError('NOT_FOUND', 'Work order not found')
    if (workOrder.status === 'issued') {
      throw new SecureError(
        'VALIDATION_ERROR',
        'Issued work orders are locked. Create a new work order to add a vehicle.',
      )
    }

    const { data, error } = await context.supabase
      .from('work_order_vehicles')
      .insert({
        work_order_id: params.id,
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
