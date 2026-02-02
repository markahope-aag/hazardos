import { NextResponse } from 'next/server'
import { CommissionService } from '@/lib/services/commission-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { z } from 'zod'

const commissionActionSchema = z.object({
  action: z.enum(['approve', 'mark_paid']),
})

/**
 * PATCH /api/commissions/[id]
 * Approve or mark a commission as paid
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: commissionActionSchema,
    allowedRoles: ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'],
  },
  async (_request, _context, params, body) => {
    let earning

    if (body.action === 'approve') {
      earning = await CommissionService.approveEarning(params.id)
    } else {
      earning = await CommissionService.markPaid(params.id)
    }

    return NextResponse.json(earning)
  }
)
