import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateTeamMemberSchema } from '@/lib/validations/team'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES, ROLE } from '@/lib/auth/roles'

/**
 * Guard: can the caller modify or demote the target?
 *
 * Rules:
 *   - A caller cannot modify themselves (use /settings/profile instead).
 *   - Only a tenant_owner can modify another tenant_owner OR promote
 *     someone to tenant_owner. Regular admins can't touch ownership.
 */
function assertCanAct({
  callerId,
  callerRole,
  targetId,
  targetRole,
  nextRole,
}: {
  callerId: string
  callerRole: string
  targetId: string
  targetRole: string
  nextRole?: string
}) {
  if (callerId === targetId) {
    throw new SecureError(
      'FORBIDDEN',
      "Use your own profile settings to change your own info.",
    )
  }
  const isOwnerLike =
    callerRole === ROLE.TENANT_OWNER ||
    callerRole === ROLE.PLATFORM_OWNER ||
    callerRole === ROLE.PLATFORM_ADMIN
  if (targetRole === ROLE.TENANT_OWNER && !isOwnerLike) {
    throw new SecureError(
      'FORBIDDEN',
      'Only the tenant owner can modify the tenant owner.',
    )
  }
  if (nextRole === ROLE.TENANT_OWNER && !isOwnerLike) {
    throw new SecureError(
      'FORBIDDEN',
      'Only the tenant owner can promote someone to tenant owner.',
    )
  }
}

async function loadTarget(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  id: string,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, organization_id, role, is_active, first_name, last_name, email')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()
  if (error || !data) {
    throw new SecureError('NOT_FOUND', 'Team member not found')
  }
  return data
}

/**
 * PATCH /api/team/[id]
 * Update a team member's name and/or role.
 */
export const PATCH = createApiHandlerWithParams(
  {
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: updateTeamMemberSchema,
  },
  async (_request, context, params, body) => {
    const target = await loadTarget(
      context.supabase,
      params.id,
      context.profile.organization_id,
    )

    assertCanAct({
      callerId: context.user.id,
      callerRole: context.profile.role,
      targetId: target.id,
      targetRole: target.role,
      nextRole: body.role,
    })

    const update: Record<string, unknown> = {}
    if (body.first_name !== undefined) update.first_name = body.first_name
    if (body.last_name !== undefined) update.last_name = body.last_name
    if (body.role !== undefined) update.role = body.role

    const { data, error } = await context.supabase
      .from('profiles')
      .update(update)
      .eq('id', params.id)
      .select('id, first_name, last_name, email, role, last_login_at, is_active')
      .single()

    if (error) throwDbError(error, 'update team member')

    return NextResponse.json({ member: data })
  },
)

/**
 * DELETE /api/team/[id]
 * Soft-deactivate a team member. Historical records (jobs they created,
 * surveys they ran, etc.) stay intact so the audit trail isn't orphaned;
 * they just lose the ability to sign in and won't appear in assignment
 * dropdowns. Use DELETE for UX familiarity — the row isn't actually
 * removed. Hard-delete is intentionally out of scope.
 */
export const DELETE = createApiHandlerWithParams(
  {
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, context, params) => {
    const target = await loadTarget(
      context.supabase,
      params.id,
      context.profile.organization_id,
    )

    assertCanAct({
      callerId: context.user.id,
      callerRole: context.profile.role,
      targetId: target.id,
      targetRole: target.role,
    })

    const { error } = await context.supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', params.id)

    if (error) throwDbError(error, 'deactivate team member')

    return NextResponse.json({ success: true })
  },
)
