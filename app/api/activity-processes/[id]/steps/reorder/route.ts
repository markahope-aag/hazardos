import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { reorderStepsSchema } from '@/lib/validations/activity-processes'

/**
 * POST /api/activity-processes/:id/steps/reorder
 *
 * Takes the complete ordered list of step ids rather than a move instruction.
 * A client working from a stale view can then only be rejected outright, not
 * silently apply half an order.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: reorderStepsSchema,
  },
  async (request, context, body) => {
    const parts = request.nextUrl.pathname.split('/').filter(Boolean)
    // .../activity-processes/:id/steps/reorder
    const processId = parts[parts.length - 3]

    const { data: existing, error: readError } = await context.supabase
      .from('activity_process_steps')
      .select('id')
      .eq('process_id', processId)
      .eq('organization_id', context.profile.organization_id)

    if (readError) throwDbError(readError, 'read automation steps')

    const known = new Set((existing ?? []).map((s) => s.id))
    if (known.size !== body.step_ids.length || body.step_ids.some((id) => !known.has(id))) {
      throw new SecureError(
        'VALIDATION_ERROR',
        'The step list has changed since this page was loaded. Reload and try again.'
      )
    }

    // Gaps of ten leave room to insert between two steps later without
    // renumbering the whole chain.
    const updates = body.step_ids.map((id, index) =>
      context.supabase
        .from('activity_process_steps')
        .update({ sort_order: (index + 1) * 10 })
        .eq('id', id)
        .eq('process_id', processId)
    )

    const results = await Promise.all(updates)
    const failure = results.find((r) => r.error)
    if (failure?.error) throwDbError(failure.error, 'reorder automation steps')

    return NextResponse.json({ success: true })
  }
)
