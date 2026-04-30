import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { LocationService } from '@/lib/services/location-service'
import { locationSchema } from '@/lib/validations/location'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/locations
 * Create a new location for the caller's organization.
 */
export const POST = createApiHandler(
  {
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: locationSchema,
  },
  async (_request, context, body) => {
    const location = await LocationService.create(context.profile.organization_id, {
      name: body.name,
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
    })

    return NextResponse.json({ location }, { status: 201 })
  },
)
