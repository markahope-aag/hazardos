import { NextResponse } from 'next/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { moveOpportunitySchema } from '@/lib/validations/pipeline'
import { z } from 'zod'

const moveSchema = moveOpportunitySchema.extend({
  notes: z.string().max(1000).optional(),
})

/**
 * POST /api/pipeline/[id]/move
 * Move an opportunity to a different stage
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: moveSchema,
  },
  async (_request, _context, params, body) => {
    const opportunity = await PipelineService.moveOpportunity(params.id, body.stage_id, body.notes)
    return NextResponse.json(opportunity)
  }
)
