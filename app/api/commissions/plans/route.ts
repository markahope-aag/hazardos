import { NextResponse } from 'next/server'
import { CommissionService } from '@/lib/services/commission-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createCommissionPlanSchema } from '@/lib/validations/commissions'

/**
 * GET /api/commissions/plans
 * List commission plans
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async () => {
    const plans = await CommissionService.getPlans()
    return NextResponse.json(plans)
  }
)

/**
 * POST /api/commissions/plans
 * Create a commission plan
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createCommissionPlanSchema,
  },
  async (_request, _context, body) => {
    const plan = await CommissionService.createPlan(body)
    return NextResponse.json(plan)
  }
)
