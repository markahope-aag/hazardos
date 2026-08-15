import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { createActivityOutcomeSchema } from '@/lib/validations/activity-outcomes'

const COLUMNS = 'id, name, halts_chain, is_active, is_system, sort_order, created_at, updated_at'

/**
 * GET /api/activity-outcomes
 *
 * Returns inactive outcomes too — this is the management view, matching the
 * email-templates management endpoint.
 */
export const GET = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_READ },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('activity_outcomes')
      .select(COLUMNS)
      .eq('organization_id', context.profile.organization_id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throwDbError(error, 'list activity outcomes')

    return NextResponse.json({ activityOutcomes: data ?? [] })
  }
)

export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: createActivityOutcomeSchema,
  },
  async (_request, context, body) => {
    const { data, error } = await context.supabase
      .from('activity_outcomes')
      .insert({
        organization_id: context.profile.organization_id,
        name: body.name,
        halts_chain: body.halts_chain ?? false,
        is_active: body.is_active ?? true,
      })
      .select(COLUMNS)
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new SecureError('VALIDATION_ERROR', 'An outcome with that name already exists')
      }
      throwDbError(error, 'create activity outcome')
    }

    return NextResponse.json({ activityOutcome: data }, { status: 201 })
  }
)
