import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { createMaterialUsageSchema } from '@/lib/validations/jobs'
import { ROLES } from '@/lib/auth/roles'
import type { JobMaterialUsage } from '@/types/job-completion'

/**
 * Recording what was used on site is field work, so technicians belong here.
 * What they must not see is what any of it costs (2026-07-28 client call), and
 * these records carry unit_cost and total_cost. So the endpoints stay open to
 * TENANT_FIELD and the money is stripped per role instead, rather than locking
 * the field crew out of their own paperwork.
 */
type CostFreeUsage = Omit<JobMaterialUsage, 'unit_cost' | 'total_cost'>

function withoutCost(row: JobMaterialUsage): CostFreeUsage {
  const { unit_cost: _unitCost, total_cost: _totalCost, ...rest } = row
  return rest
}

const canSeeCost = (role: string | null | undefined) => ROLES.FINANCIAL_VIEW.includes(role ?? '')

/**
 * GET /api/jobs/[id]/material-usage
 * Get material usage for a job. Cost columns are omitted for roles that are
 * not allowed to see money.
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_FIELD },
  async (_request, context, params) => {
    const materialUsage = await JobCompletionService.getMaterialUsage(params.id)
    if (canSeeCost(context.profile.role)) return NextResponse.json(materialUsage)

    const rows = Array.isArray(materialUsage) ? materialUsage : []
    return NextResponse.json(rows.map(withoutCost))
  }
)

/**
 * POST /api/jobs/[id]/material-usage
 * Record material used. A caller who may not see cost may not set it either:
 * the field is dropped rather than rejected, so a technician's entry still
 * saves and the office fills the cost in later.
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_FIELD,
    bodySchema: createMaterialUsageSchema,
  },
  async (_request, context, params, body) => {
    const allowed = canSeeCost(context.profile.role)
    const { unit_cost: _submittedCost, ...costFreeBody } = body
    const payload = allowed ? body : costFreeBody

    const materialUsage = await JobCompletionService.createMaterialUsage({
      job_id: params.id,
      ...payload,
    })

    return NextResponse.json(allowed ? materialUsage : withoutCost(materialUsage), { status: 201 })
  }
)
