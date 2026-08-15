import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { TimeClockService } from '@/lib/services/time-clock-service'
import { submitRangeSchema } from '@/lib/validations/time-clock'

/**
 * POST /api/time-clock/submit
 * Submits every closed entry the caller has in [from, to] for approval.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_FIELD,
    bodySchema: submitRangeSchema,
  },
  async (_request, context, body) => {
    const result = await TimeClockService.submitRange(context.profile.organization_id, context.user.id, body)
    return NextResponse.json(result)
  },
)
