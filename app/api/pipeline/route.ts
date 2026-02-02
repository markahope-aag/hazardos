import { NextResponse } from 'next/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createOpportunitySchema, pipelineListQuerySchema } from '@/lib/validations/pipeline'

/**
 * GET /api/pipeline
 * Get pipeline data (stages, opportunities, metrics) with optional pagination
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: pipelineListQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const [stages, opportunitiesResult, metrics] = await Promise.all([
      PipelineService.getStages(),
      PipelineService.getOpportunities({
        stageId: query.stage_id,
        limit: query.limit,
        offset: query.offset,
      }),
      PipelineService.getPipelineMetrics(),
    ])

    return NextResponse.json({
      stages,
      opportunities: opportunitiesResult.opportunities,
      metrics,
      pagination: {
        total: opportunitiesResult.total,
        limit: opportunitiesResult.limit,
        offset: opportunitiesResult.offset,
      },
    })
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
