import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateMaterialUsageSchema } from '@/lib/validations/jobs'

/**
 * PATCH /api/jobs/[id]/material-usage/[usageId]
 * Update a material usage record
 */
export const PATCH = createApiHandlerWithParams<
  typeof updateMaterialUsageSchema._type,
  unknown,
  { id: string; usageId: string }
>(
  {
    rateLimit: 'general',
    bodySchema: updateMaterialUsageSchema,
  },
  async (_request, _context, params, body) => {
    const materialUsage = await JobCompletionService.updateMaterialUsage(params.usageId, {
      material_name: body.material_name,
      material_type: body.material_type,
      quantity_estimated: body.quantity_estimated,
      quantity_used: body.quantity_used,
      unit: body.unit,
      unit_cost: body.unit_cost,
      notes: body.notes,
    })

    return NextResponse.json(materialUsage)
  }
)

/**
 * DELETE /api/jobs/[id]/material-usage/[usageId]
 * Delete a material usage record
 */
export const DELETE = createApiHandlerWithParams<
  unknown,
  unknown,
  { id: string; usageId: string }
>(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    await JobCompletionService.deleteMaterialUsage(params.usageId)
    return NextResponse.json({ success: true })
  }
)
