import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { LocationService } from '@/lib/services/location-service'
import { updateLocationSchema } from '@/lib/validations/location'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

async function loadLocation(
  organizationId: string,
  id: string,
) {
  const location = await LocationService.get(id)
  if (!location || location.organization_id !== organizationId) {
    throw new SecureError('NOT_FOUND', 'Location not found')
  }
  return location
}

/**
 * GET /api/locations/[id]
 */
export const GET = createApiHandlerWithParams(
  { allowedRoles: ROLES.TENANT_READ },
  async (_request, context, params) => {
    const location = await loadLocation(context.profile.organization_id, params.id)
    return NextResponse.json({ location })
  },
)

/**
 * PATCH /api/locations/[id]
 */
export const PATCH = createApiHandlerWithParams(
  {
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: updateLocationSchema,
  },
  async (_request, context, params, body) => {
    await loadLocation(context.profile.organization_id, params.id)

    const location = await LocationService.update(params.id, {
      name: body.name ?? undefined,
      code: body.code ?? undefined,
      address_line1: body.address_line1 ?? undefined,
      address_line2: body.address_line2 ?? undefined,
      city: body.city ?? undefined,
      state: body.state ?? undefined,
      zip: body.zip ?? undefined,
      country: body.country ?? undefined,
      phone: body.phone ?? undefined,
      email: body.email || undefined,
      timezone: body.timezone ?? undefined,
      is_headquarters: body.is_headquarters,
      is_active: body.is_active,
    })

    return NextResponse.json({ location })
  },
)

/**
 * DELETE /api/locations/[id]
 */
export const DELETE = createApiHandlerWithParams(
  { allowedRoles: ROLES.TENANT_ADMIN },
  async (_request, context, params) => {
    const location = await loadLocation(context.profile.organization_id, params.id)
    if (location.is_headquarters) {
      throw new SecureError(
        'FORBIDDEN',
        'Cannot delete the headquarters location. Set another location as HQ first.',
      )
    }
    await LocationService.delete(params.id)
    return NextResponse.json({ success: true })
  },
)
