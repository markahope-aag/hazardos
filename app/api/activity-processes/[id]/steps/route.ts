import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { createStepSchema } from '@/lib/validations/activity-processes'

const STEP_COLUMNS =
  'id, sort_order, kind, activity_type_id, note, assignee_mode, assigned_to, due_mode, due_days, due_time, due_hours, due_minutes, reminder_minutes, email_template_id, sms_template_id'

function processIdFrom(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  // .../activity-processes/:id/steps
  return parts[parts.length - 2]
}

/**
 * POST /api/activity-processes/:id/steps
 *
 * Appends a step to the end of the chain. Order is managed by the reorder
 * endpoint rather than by asking the caller for a position, so two people
 * adding steps at once cannot land on the same sort_order.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: createStepSchema,
  },
  async (request, context, body) => {
    const processId = processIdFrom(request.nextUrl.pathname)

    // Confirms the chain belongs to this tenant before writing a step that
    // carries the org id. The database enforces the match too, but a clear
    // 404 beats a constraint violation.
    const { data: process } = await context.supabase
      .from('activity_processes')
      .select('id')
      .eq('id', processId)
      .eq('organization_id', context.profile.organization_id)
      .maybeSingle()

    if (!process) throw new SecureError('NOT_FOUND', 'Automation not found')

    const { data: last } = await context.supabase
      .from('activity_process_steps')
      .select('sort_order')
      .eq('process_id', processId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data, error } = await context.supabase
      .from('activity_process_steps')
      .insert({
        organization_id: context.profile.organization_id,
        process_id: processId,
        sort_order: (last?.sort_order ?? 0) + 10,
        kind: body.kind,
        activity_type_id: body.activity_type_id ?? null,
        note: body.note ?? null,
        assignee_mode: body.assignee_mode ?? 'unassigned',
        assigned_to: body.assigned_to ?? null,
        due_mode: body.due_mode ?? 'immediate',
        due_days: body.due_days ?? 0,
        due_time: body.due_time ?? null,
        due_hours: body.due_hours ?? 0,
        due_minutes: body.due_minutes ?? 0,
        reminder_minutes: body.reminder_minutes ?? null,
        // Only the template for this step's own channel is kept. A call step
        // carrying an email template is a leftover from switching the kind,
        // and storing it would make the step look like it sends.
        email_template_id: body.kind === 'email' ? body.email_template_id ?? null : null,
        sms_template_id: body.kind === 'text' ? body.sms_template_id ?? null : null,
      })
      .select(STEP_COLUMNS)
      .single()

    if (error) throwDbError(error, 'create automation step')

    return NextResponse.json({ step: data }, { status: 201 })
  }
)
