import { NextResponse } from 'next/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createOpportunitySchema } from '@/lib/validations/pipeline'

/**
 * GET /api/pipeline
 * Get pipeline data (stages, opportunities, metrics)
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
  },
  async () => {
    const [stages, opportunities, metrics] = await Promise.all([
      PipelineService.getStages(),
      PipelineService.getOpportunities(),
      PipelineService.getPipelineMetrics(),
    ])

    return NextResponse.json({ stages, opportunities, metrics })
  }
)

/**
 * POST /api/pipeline
 * Create a new opportunity
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createOpportunitySchema,
  },
  async (_request, _context, body) => {
    const opportunity = await PipelineService.createOpportunity(body)
    return NextResponse.json(opportunity, { status: 201 })
  }
)
