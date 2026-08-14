import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { updateStepSchema } from '@/lib/validations/activity-processes'

const STEP_COLUMNS =
  'id, sort_order, kind, activity_type_id, note, assignee_mode, assigned_to, due_mode, due_days, due_time, due_hours, due_minutes, reminder_minutes, email_template_id, sms_template_id'

function idsFrom(pathname: string): { processId: string; stepId: string } {
  const parts = pathname.split('/').filter(Boolean)
  // .../activity-processes/:id/steps/:stepId
  return { processId: parts[parts.length - 3], stepId: parts[parts.length - 1] }
}

export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: updateStepSchema,
  },
  async (request, context, body) => {
    const { processId, stepId } = idsFrom(request.nextUrl.pathname)

    const patch: Record<string, unknown> = { ...body }

    // Changing a step's kind leaves the old channel's template attached, which
    // would make an email step look like it sends over SMS. Clear whichever
    // template no longer applies.
    if (body.kind !== undefined) {
      if (body.kind !== 'email') patch.email_template_id = null
      if (body.kind !== 'text') patch.sms_template_id = null
    }

    // Moving off a named assignee has to release the person, or the step keeps
    // a name the mode says it does not use and the database rejects the write.
    if (body.assignee_mode !== undefined && body.assignee_mode !== 'user') {
      patch.assigned_to = null
    }

    const { data, error } = await context.supabase
      .from('activity_process_steps')
      .update(patch)
      .eq('id', stepId)
      .eq('process_id', processId)
      .eq('organization_id', context.profile.organization_id)
      .select(STEP_COLUMNS)
      .maybeSingle()

    if (error) throwDbError(error, 'update automation step')
    if (!data) throw new SecureError('NOT_FOUND', 'Step not found')

    return NextResponse.json({ step: data })
  }
)

export const DELETE = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_WRITE },
  async (request, context) => {
    const { processId, stepId } = idsFrom(request.nextUrl.pathname)

    const { error } = await context.supabase
      .from('activity_process_steps')
      .delete()
      .eq('id', stepId)
      .eq('process_id', processId)
      .eq('organization_id', context.profile.organization_id)

    if (error) throwDbError(error, 'delete automation step')

    // Work already created by this step keeps its process_step_id, which is now
    // a dangling reference the foreign key nulls out. Deliberate: the work is
    // real and somebody may still owe it, and deleting a step should not delete
    // a task from somebody's list.
    return NextResponse.json({ success: true })
  }
)
