import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { createActivityTypeSchema } from '@/lib/validations/activity-types'

const COLUMNS = 'id, name, kind, is_active, is_system, sort_order, created_at, updated_at'

/**
 * GET /api/activity-types
 *
 * Returns inactive types too — this is the management view, matching the
 * email-templates management endpoint.
 */
export const GET = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_READ },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('activity_types')
      .select(COLUMNS)
      .eq('organization_id', context.profile.organization_id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throwDbError(error, 'list activity types')

    return NextResponse.json({ activityTypes: data ?? [] })
  }
)

export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: createActivityTypeSchema,
  },
  async (_request, context, body) => {
    const { data, error } = await context.supabase
      .from('activity_types')
      .insert({
        organization_id: context.profile.organization_id,
        name: body.name,
        kind: body.kind,
        is_active: body.is_active ?? true,
      })
      .select(COLUMNS)
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new SecureError('VALIDATION_ERROR', 'A type with that name already exists')
      }
      throwDbError(error, 'create activity type')
    }

    return NextResponse.json({ activityType: data }, { status: 201 })
  }
)
