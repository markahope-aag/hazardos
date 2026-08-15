import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { TimeClockService } from '@/lib/services/time-clock-service'
import { clockOutSchema } from '@/lib/validations/time-clock'

/**
 * POST /api/time-clock/clock-out
 * Closes the caller's own open entry.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_FIELD,
    bodySchema: clockOutSchema,
  },
  async (_request, context, body) => {
    const entry = await TimeClockService.clockOut(body.entry_id, context.user.id)
    return NextResponse.json({ entry })
  },
)
