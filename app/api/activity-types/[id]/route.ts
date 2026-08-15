import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { updateActivityTypeSchema } from '@/lib/validations/activity-types'

const COLUMNS = 'id, name, kind, is_active, is_system, sort_order, created_at, updated_at'

function idFrom(pathname: string): string {
  return pathname.split('/').filter(Boolean).pop()!
}

export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: updateActivityTypeSchema,
  },
  async (request, context, body) => {
    const id = idFrom(request.nextUrl.pathname)

    const { data, error } = await context.supabase
      .from('activity_types')
      .update(body)
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)
      .select(COLUMNS)
      .maybeSingle()

    if (error) {
      if (error.code === '23505') {
        throw new SecureError('VALIDATION_ERROR', 'A type with that name already exists')
      }
      throwDbError(error, 'update activity type')
    }
    if (!data) throw new SecureError('NOT_FOUND', 'Activity type not found')

    return NextResponse.json({ activityType: data })
  }
)

/**
 * DELETE /api/activity-types/:id
 *
 * Refuses while a rule or a process step still references this type. Rules
 * cascade-delete on the FK — silently deleting the automations that use it is
 * worse than a loud refusal. Steps merely null the reference, which looks
 * identical to a step nobody finished configuring, so that's blocked too.
 * Deactivating (is_active: false) is the safe way to retire a type that's
 * still referenced anywhere.
 */
export const DELETE = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
  async (request, context) => {
    const id = idFrom(request.nextUrl.pathname)

    const [{ data: ruleUsers }, { data: stepUsers }] = await Promise.all([
      context.supabase
        .from('activity_process_rules')
        .select('process:activity_processes!process_id(name)')
        .eq('activity_type_id', id)
        .eq('organization_id', context.profile.organization_id),
      context.supabase
        .from('activity_process_steps')
        .select('process:activity_processes!process_id(name)')
        .eq('activity_type_id', id)
        .eq('organization_id', context.profile.organization_id),
    ])

    const names = [
      ...new Set(
        [...(ruleUsers ?? []), ...(stepUsers ?? [])]
          .map((row) => {
            const p = (row as { process?: { name?: string } | { name?: string }[] }).process
            return Array.isArray(p) ? p[0]?.name : p?.name
          })
          .filter(Boolean) as string[]
      ),
    ]

    if (names.length > 0) {
      throw new SecureError(
        'VALIDATION_ERROR',
        `Still used by: ${names.join(', ')}. Change those automations first, or turn this off instead of deleting it.`
      )
    }

    const { error } = await context.supabase
      .from('activity_types')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)

    if (error) throwDbError(error, 'delete activity type')

    return NextResponse.json({ success: true })
  }
)
