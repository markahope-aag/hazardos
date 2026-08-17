import { NextResponse } from 'next/server'
import { CommissionService } from '@/lib/services/commission-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createCommissionPlanSchema } from '@/lib/validations/commissions'
import { ROLES } from '@/lib/auth/roles'

/**
 * GET /api/commissions/plans
 * List commission plans
 */
export const GET = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
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
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, _context, body) => {
    const plan = await CommissionService.createPlan(body)
    return NextResponse.json(plan)
  }
)
