import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { TimeClockService } from '@/lib/services/time-clock-service'
import { reviewEntriesSchema } from '@/lib/validations/time-clock'

/**
 * GET /api/time-clock/approvals
 * Every entry across the org waiting on a supervisor. Admin/estimator/owner
 * roles only — a technician doesn't get to see the whole crew's hours.
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
  },
  async (_request, context) => {
    const entries = await TimeClockService.listSubmitted(context.profile.organization_id)
    return NextResponse.json({ entries })
  },
)

/**
 * POST /api/time-clock/approvals
 * Approve or reject a batch of submitted entries at once — reviewing a
 * technician's week, not one clock-in at a time.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: reviewEntriesSchema,
  },
  async (_request, context, body) => {
    const decision = body.action === 'approve' ? 'approved' : 'rejected'
    const result = await TimeClockService.review(
      context.profile.organization_id,
      body.entry_ids,
      context.user.id,
      decision,
      body.notes,
    )
    return NextResponse.json(result)
  },
)
