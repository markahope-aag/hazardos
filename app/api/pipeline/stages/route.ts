import { NextResponse } from 'next/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createStageSchema } from '@/lib/validations/pipeline'

/**
 * GET /api/pipeline/stages
 * List pipeline stages
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async () => {
    const stages = await PipelineService.getStages()
    return NextResponse.json(stages)
  }
)

/**
 * POST /api/pipeline/stages
 * Create a pipeline stage
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createStageSchema,
  },
  async (_request, _context, body) => {
    const stage = await PipelineService.createStage(body)
    return NextResponse.json(stage)
  }
)
