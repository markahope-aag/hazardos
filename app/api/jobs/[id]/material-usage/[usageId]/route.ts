import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateMaterialUsageSchema } from '@/lib/validations/jobs'
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
export const DELETE = createApiHandlerWithParams<unknown, unknown, Params>(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    await JobCompletionService.deleteMaterialUsage(params.usageId)
    return NextResponse.json({ success: true })
  }
)
