import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { updateRuleSchema } from '@/lib/validations/activity-process-rules'

const RULE_COLUMNS =
  'id, name, event_type, activity_type_id, outcome_id, pipeline_stage_id, job_status, lab_result, message_channel, contact_type, process_id, is_active, sort_order'

function ruleIdFrom(pathname: string): string {
  return pathname.split('/').filter(Boolean).pop()!
}

export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: updateRuleSchema,
  },
  async (request, context, body) => {
    const id = ruleIdFrom(request.nextUrl.pathname)

    // Changing the event type leaves the previous event's qualifiers attached,
    // which the database rejects and which would in any case describe a
    // condition the new trigger cannot evaluate. Clear whatever no longer
    // applies rather than making the caller remember to.
    const patch: Record<string, unknown> = { ...body }
    if (body.event_type !== undefined) {
      const keep: Record<string, string[]> = {
        activity_completed: ['activity_type_id', 'outcome_id'],
        opportunity_stage_changed: ['pipeline_stage_id'],
        job_status_changed: ['job_status'],
        lab_result_received: ['lab_result'],
        message_failed: ['message_channel'],
      }
      const allowed = keep[body.event_type] ?? []
      for (const field of ['activity_type_id', 'outcome_id', 'pipeline_stage_id', 'job_status', 'lab_result', 'message_channel']) {
        if (!allowed.includes(field)) patch[field] = null
      }
    }

    const { data, error } = await context.supabase
      .from('activity_process_rules')
      .update(patch)
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)
      .select(RULE_COLUMNS)
      .maybeSingle()

    if (error) {
      if (error.code === '23505') {
        throw new SecureError('VALIDATION_ERROR', 'That exact trigger already exists')
      }
      throwDbError(error, 'update automation rule')
    }
    if (!data) throw new SecureError('NOT_FOUND', 'Trigger not found')

    return NextResponse.json({ rule: data })
  }
)

export const DELETE = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
  async (request, context) => {
    const id = ruleIdFrom(request.nextUrl.pathname)

    const { error } = await context.supabase
      .from('activity_process_rules')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)

    if (error) throwDbError(error, 'delete automation rule')

    // Work already created by this rule's chain is left alone. It is real work
    // somebody may still owe; removing the trigger stops future runs, not the
    // ones that already happened.
    return NextResponse.json({ success: true })
  }
)
