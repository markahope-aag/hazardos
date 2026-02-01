import { NextResponse } from 'next/server'
import { CommissionService } from '@/lib/services/commission-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { commissionSummaryQuerySchema } from '@/lib/validations/commissions'

/**
 * GET /api/commissions/summary
 * Get commission summary
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: commissionSummaryQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const summary = await CommissionService.getSummary(query.user_id || undefined)
    return NextResponse.json(summary)
  }
)
