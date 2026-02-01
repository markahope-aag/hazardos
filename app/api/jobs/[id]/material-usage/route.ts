import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { createMaterialUsageSchema } from '@/lib/validations/jobs'

/**
 * GET /api/jobs/[id]/material-usage
 * Get material usage for a job
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    const materialUsage = await JobCompletionService.getMaterialUsage(params.id)
    return NextResponse.json(materialUsage)
  }
)

/**
 * POST /api/jobs/[id]/material-usage
 * Create material usage record for a job
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: createMaterialUsageSchema,
  },
  async (_request, _context, params, body) => {
    const materialUsage = await JobCompletionService.createMaterialUsage({
      job_id: params.id,
      ...body,
    })

    return NextResponse.json(materialUsage, { status: 201 })
  }
)
