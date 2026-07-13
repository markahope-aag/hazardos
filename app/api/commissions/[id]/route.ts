import { NextResponse } from 'next/server'
import { CommissionService } from '@/lib/services/commission-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { z } from 'zod'

const commissionActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'mark_paid']),
  reason: z.string().max(500).optional(),
})

/**
 * PATCH /api/commissions/[id]
 * Approve, reject, or mark a commission as paid
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: commissionActionSchema,
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, _context, params, body) => {
    let earning

    if (body.action === 'approve') {
      earning = await CommissionService.approveEarning(params.id)
    } else if (body.action === 'reject') {
      earning = await CommissionService.rejectEarning(params.id, body.reason)
    } else {
      earning = await CommissionService.markPaid(params.id)
    }

    return NextResponse.json(earning)
  }
)
