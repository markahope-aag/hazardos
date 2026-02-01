import { NextResponse } from 'next/server'
import { CommissionService } from '@/lib/services/commission-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { commissionListQuerySchema, createCommissionSchema } from '@/lib/validations/commissions'

/**
 * GET /api/commissions
 * List commission earnings
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: commissionListQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const earnings = await CommissionService.getEarnings({
      user_id: query.user_id,
      status: query.status,
      pay_period: query.pay_period,
    })

    return NextResponse.json(earnings)
  }
)

/**
 * POST /api/commissions
 * Create a commission earning
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createCommissionSchema,
  },
  async (_request, _context, body) => {
    const earning = await CommissionService.createEarning({
      user_id: body.user_id,
      plan_id: body.plan_id,
      opportunity_id: body.opportunity_id,
      job_id: body.job_id,
      invoice_id: body.invoice_id,
      base_amount: body.base_amount,
    })

    return NextResponse.json(earning)
  }
)
