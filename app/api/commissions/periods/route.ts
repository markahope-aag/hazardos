import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { CommissionService } from '@/lib/services/commission-service'
import { z } from 'zod'

/**
 * GET /api/commissions/periods — list commission periods with roll-up
 * totals and open/closed state (CO6).
 */
export const GET = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
  async () => {
    const periods = await CommissionService.getPeriods()
    return NextResponse.json({ periods })
  },
)

const setStatusSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM'),
  status: z.enum(['open', 'closed']),
})

/**
 * POST /api/commissions/periods — close or reopen a period. Closing locks
 * every earning dated in that month against edits (enforced by a DB
 * trigger).
 */
export const POST = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN, bodySchema: setStatusSchema },
  async (_request, _context, body) => {
    await CommissionService.setPeriodStatus(body.period, body.status)
    return NextResponse.json({ success: true })
  },
)
