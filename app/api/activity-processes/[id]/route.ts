import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { updateProcessSchema } from '@/lib/validations/activity-processes'

const STEP_COLUMNS =
  'id, sort_order, kind, activity_type_id, note, assignee_mode, assigned_to, due_mode, due_days, due_time, due_hours, due_minutes, reminder_minutes, email_template_id, sms_template_id'

/** GET /api/activity-processes/:id returns the chain and its ordered steps. */
export const GET = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_READ },
  async (request, context) => {
    const id = request.nextUrl.pathname.split('/').filter(Boolean).pop()!

    const { data: process, error } = await context.supabase
      .from('activity_processes')
      .select('id, name, description, is_active, use_saturdays, use_sundays, created_at, updated_at')
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)
      .maybeSingle()

    if (error) throwDbError(error, 'fetch activity process')
    if (!process) throw new SecureError('NOT_FOUND', 'Automation not found')

    const { data: steps, error: stepsError } = await context.supabase
      .from('activity_process_steps')
      .select(STEP_COLUMNS)
      .eq('process_id', id)
      .order('sort_order', { ascending: true })

    if (stepsError) throwDbError(stepsError, 'fetch activity process steps')

    return NextResponse.json({ process, steps: steps ?? [] })
  }
)

export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: updateProcessSchema,
  },
  async (request, context, body) => {
    const id = request.nextUrl.pathname.split('/').filter(Boolean).pop()!

    // Turning a chain on is the moment it starts affecting customers, so it
    // must have something to do. An empty chain that is "active" looks
    // configured and does nothing.
    if (body.is_active === true) {
      const { count } = await context.supabase
        .from('activity_process_steps')
        .select('id', { count: 'exact', head: true })
        .eq('process_id', id)

      if ((count ?? 0) === 0) {
        throw new SecureError('VALIDATION_ERROR', 'Add at least one step before turning this automation on')
      }
    }

    const { data, error } = await context.supabase
      .from('activity_processes')
      .update(body)
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)
      .select('id, name, description, is_active, use_saturdays, use_sundays')
      .maybeSingle()

    if (error) throwDbError(error, 'update activity process')
    if (!data) throw new SecureError('NOT_FOUND', 'Automation not found')

    return NextResponse.json({ process: data })
  }
)

/**
 * DELETE /api/activity-processes/:id
 *
 * Refuses while any rule still points at the chain. Deleting it anyway would
 * cascade the rules away, so an event that used to do something would quietly
 * start doing nothing, and the only trace would be a chain nobody remembers
 * removing.
 */
export const DELETE = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
  async (request, context) => {
    const id = request.nextUrl.pathname.split('/').filter(Boolean).pop()!

    const { count } = await context.supabase
      .from('activity_process_rules')
      .select('id', { count: 'exact', head: true })
      .eq('process_id', id)

    if ((count ?? 0) > 0) {
      throw new SecureError(
        'VALIDATION_ERROR',
        `Remove the ${count} rule${count === 1 ? '' : 's'} pointing at this automation first`
      )
    }

    const { error } = await context.supabase
      .from('activity_processes')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)

    if (error) throwDbError(error, 'delete activity process')

    return NextResponse.json({ success: true })
  }
)
