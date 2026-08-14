import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { throwDbError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/activity-vocabulary
 *
 * The organization's own words for work items: what kinds of step exist and
 * how a step can turn out. Both are per-tenant data seeded with generic
 * defaults, so this is read by every screen that creates or completes work
 * rather than hardcoding a list.
 *
 * Returns active entries only. Deactivated entries stay in the database so
 * historic rows keep their label, but nobody should be able to pick one for
 * new work.
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_READ,
  },
  async (_request, context) => {
    const [typesResult, outcomesResult] = await Promise.all([
      context.supabase
        .from('activity_types')
        .select('id, name, kind, is_active, is_system, sort_order')
        .eq('organization_id', context.profile.organization_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      context.supabase
        .from('activity_outcomes')
        .select('id, name, halts_chain, is_active, is_system, sort_order')
        .eq('organization_id', context.profile.organization_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ])

    if (typesResult.error) throwDbError(typesResult.error, 'fetch activity types')
    if (outcomesResult.error) throwDbError(outcomesResult.error, 'fetch activity outcomes')

    return NextResponse.json({
      activity_types: typesResult.data ?? [],
      activity_outcomes: outcomesResult.data ?? [],
    })
  }
)
