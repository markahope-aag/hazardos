import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { manifestVehicleSchema } from '@/lib/validations/manifests'
import { SecureError, throwDbError, createSecureErrorResponse } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * Vehicle subresource handlers. Because the createApiHandlerWithParams
 * helper only types a single `id` param, and we need both `id` (manifest)
 * and `vehicleId`, we inline the auth-and-org dance here instead of
 * forcing the helper to grow a generic. Same permissions as the parent:
 * TENANT_MANAGE roles only.
 */
async function loadContext(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new SecureError('UNAUTHORIZED')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) throw new SecureError('UNAUTHORIZED')
  if (!ROLES.TENANT_MANAGE.includes(profile.role)) {
    throw new SecureError('FORBIDDEN', 'Insufficient permissions')
  }
  return { supabase, user, profile }
}

async function assertDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  manifestId: string,
  organizationId: string,
) {
  const { data: manifest } = await supabase
    .from('manifests')
    .select('id, status')
    .eq('id', manifestId)
    .eq('organization_id', organizationId)
    .single()

  if (!manifest) throw new SecureError('NOT_FOUND', 'Manifest not found')
  if (manifest.status === 'issued') {
    throw new SecureError(
      'VALIDATION_ERROR',
      'Issued manifests are locked.',
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vehicleId: string }> },
) {
  try {
    const { id, vehicleId } = await params
    const { supabase, profile } = await loadContext(request)
    await assertDraft(supabase, id, profile.organization_id)

    const body = await request.json().catch(() => ({}))
    const parsed = manifestVehicleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Invalid body', details: parsed.error.issues } },
        { status: 400 },
      )
    }

    const update: Record<string, unknown> = {}
    const v = parsed.data
    if (v.vehicle_type !== undefined) update.vehicle_type = v.vehicle_type
    if (v.make_model !== undefined) update.make_model = v.make_model
    if (v.plate !== undefined) update.plate = v.plate
    if (v.driver_profile_id !== undefined) update.driver_profile_id = v.driver_profile_id
    if (v.driver_name !== undefined) update.driver_name = v.driver_name
    if (v.is_rental !== undefined) update.is_rental = v.is_rental
    if (v.rental_vendor !== undefined) update.rental_vendor = v.rental_vendor
    if (v.rental_rate_daily !== undefined) update.rental_rate_daily = v.rental_rate_daily
    if (v.rental_start_date !== undefined) update.rental_start_date = v.rental_start_date
    if (v.rental_end_date !== undefined) update.rental_end_date = v.rental_end_date
    if (v.notes !== undefined) update.notes = v.notes
    if (v.sort_order !== undefined) update.sort_order = v.sort_order

    const { data, error } = await supabase
      .from('manifest_vehicles')
      .update(update)
      .eq('id', vehicleId)
      .eq('manifest_id', id)
      .select()
      .single()

    if (error) throwDbError(error, 'update vehicle')

    return NextResponse.json({ vehicle: data })
  } catch (err) {
    return createSecureErrorResponse(err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vehicleId: string }> },
) {
  try {
    const { id, vehicleId } = await params
    const { supabase, profile } = await loadContext(request)
    await assertDraft(supabase, id, profile.organization_id)

    const { error } = await supabase
      .from('manifest_vehicles')
      .delete()
      .eq('id', vehicleId)
      .eq('manifest_id', id)

    if (error) throwDbError(error, 'delete vehicle')

    return NextResponse.json({ success: true })
  } catch (err) {
    return createSecureErrorResponse(err)
  }
}
