import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { updateActivityOutcomeSchema } from '@/lib/validations/activity-outcomes'

const COLUMNS = 'id, name, halts_chain, is_active, is_system, sort_order, created_at, updated_at'

function idFrom(pathname: string): string {
  return pathname.split('/').filter(Boolean).pop()!
}

export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: updateActivityOutcomeSchema,
  },
  async (request, context, body) => {
    const id = idFrom(request.nextUrl.pathname)

    const { data, error } = await context.supabase
      .from('activity_outcomes')
      .update(body)
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)
      .select(COLUMNS)
      .maybeSingle()

    if (error) {
      if (error.code === '23505') {
        throw new SecureError('VALIDATION_ERROR', 'An outcome with that name already exists')
      }
      throwDbError(error, 'update activity outcome')
    }
    if (!data) throw new SecureError('NOT_FOUND', 'Activity outcome not found')

    return NextResponse.json({ activityOutcome: data })
  }
)

/**
 * DELETE /api/activity-outcomes/:id
 *
 * Refuses while a rule still references this outcome — the FK cascade-deletes
 * the rule, which would silently break an automation. Deactivating
 * (is_active: false) is the safe way to retire an outcome that's still in use.
 */
export const DELETE = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
  async (request, context) => {
    const id = idFrom(request.nextUrl.pathname)

    const { data: usedBy } = await context.supabase
      .from('activity_process_rules')
      .select('process:activity_processes!process_id(name)')
      .eq('outcome_id', id)
      .eq('organization_id', context.profile.organization_id)

    if (usedBy && usedBy.length > 0) {
      const names = [
        ...new Set(
          usedBy
            .map((row) => {
              const p = (row as { process?: { name?: string } | { name?: string }[] }).process
              return Array.isArray(p) ? p[0]?.name : p?.name
            })
            .filter(Boolean) as string[]
        ),
      ]
      throw new SecureError(
        'VALIDATION_ERROR',
        names.length
          ? `Still used by: ${names.join(', ')}. Change those automations first, or turn this off instead of deleting it.`
          : 'Still used by an automation rule. Change that rule first, or turn this off instead of deleting it.'
      )
    }

    const { error } = await context.supabase
      .from('activity_outcomes')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)

    if (error) throwDbError(error, 'delete activity outcome')

    return NextResponse.json({ success: true })
  }
)
