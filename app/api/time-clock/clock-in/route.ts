import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { TimeClockService } from '@/lib/services/time-clock-service'
import { clockInSchema } from '@/lib/validations/time-clock'

/**
 * POST /api/time-clock/clock-in
 * Starts a new open entry for the caller, optionally against a job.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_FIELD,
    bodySchema: clockInSchema,
  },
  async (_request, context, body) => {
    const entry = await TimeClockService.clockIn(context.profile.organization_id, context.user.id, body)
    return NextResponse.json({ entry }, { status: 201 })
  },
)
