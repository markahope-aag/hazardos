import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import { createProcessSchema } from '@/lib/validations/activity-processes'

/**
 * GET /api/activity-processes
 * The organization's automation chains, with a step count so the list can say
 * how substantial each one is without loading every step.
 */
export const GET = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_READ },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('activity_processes')
      .select('id, name, description, is_active, use_saturdays, use_sundays, created_at, updated_at, steps:activity_process_steps(count)')
      .eq('organization_id', context.profile.organization_id)
      .order('name', { ascending: true })

    if (error) throwDbError(error, 'list activity processes')

    const processes = (data ?? []).map((row) => {
      const { steps, ...rest } = row as Record<string, unknown> & {
        steps?: { count: number }[] | null
      }
      return { ...rest, step_count: steps?.[0]?.count ?? 0 }
    })

    return NextResponse.json({ processes })
  }
)

/**
 * POST /api/activity-processes
 *
 * New chains start inactive. A chain becomes live the moment a rule points at
 * it, and creating one is a multi-step job: name it, add the steps, then turn
 * it on. Defaulting to active would fire a half-built chain at real customers.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: createProcessSchema,
  },
  async (_request, context, body) => {
    const { data, error } = await context.supabase
      .from('activity_processes')
      .insert({
        organization_id: context.profile.organization_id,
        name: body.name,
        description: body.description ?? null,
        is_active: body.is_active ?? false,
        use_saturdays: body.use_saturdays ?? false,
        use_sundays: body.use_sundays ?? false,
        created_by: context.user.id,
      })
      .select('id, name, description, is_active, use_saturdays, use_sundays')
      .single()

    if (error) throwDbError(error, 'create activity process')

    return NextResponse.json({ process: data }, { status: 201 })
  }
)
