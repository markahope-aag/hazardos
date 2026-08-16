import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateMaterialUsageSchema } from '@/lib/validations/jobs'
import { ROLES } from '@/lib/auth/roles'
import { z } from 'zod'

type UpdateMaterialUsageBody = z.infer<typeof updateMaterialUsageSchema>
type Params = { id: string; usageId: string }

/**
 * PATCH /api/jobs/[id]/material-usage/[usageId]
 * Update a material usage record
 */
export const PATCH = createApiHandlerWithParams<UpdateMaterialUsageBody, unknown, Params>(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_FIELD,
    bodySchema: updateMaterialUsageSchema,
  },
  async (_request, context, params, body) => {
    // Same rule as the create route: a technician may correct what was used on
    // site, but unit_cost is not theirs to set, so it is dropped rather than
    // rejected and the existing value is left alone.
    const canSeeCost = ROLES.FINANCIAL_VIEW.includes(context.profile.role ?? '')

    const materialUsage = await JobCompletionService.updateMaterialUsage(params.usageId, {
      material_name: body.material_name,
      material_type: body.material_type,
      quantity_estimated: body.quantity_estimated,
      quantity_used: body.quantity_used,
      unit: body.unit,
      ...(canSeeCost ? { unit_cost: body.unit_cost } : {}),
      notes: body.notes,
    })

    if (canSeeCost) return NextResponse.json(materialUsage)
    const { unit_cost: _unitCost, total_cost: _totalCost, ...rest } = materialUsage
    return NextResponse.json(rest)
  }
)

/**
 * DELETE /api/jobs/[id]/material-usage/[usageId]
 * Delete a material usage record
 */
export const DELETE = createApiHandlerWithParams<unknown, unknown, Params>(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_FIELD },
  async (_request, _context, params) => {
    await JobCompletionService.deleteMaterialUsage(params.usageId)
    return NextResponse.json({ success: true })
  }
)
