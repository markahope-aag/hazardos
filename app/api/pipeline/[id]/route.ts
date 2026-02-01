import { NextResponse } from 'next/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateOpportunitySchema } from '@/lib/validations/pipeline'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/pipeline/[id]
 * Get an opportunity
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, _context, params) => {
    const opportunity = await PipelineService.getOpportunity(params.id)

    if (!opportunity) {
      throw new SecureError('NOT_FOUND', 'Opportunity not found')
    }

    return NextResponse.json(opportunity)
  }
)

/**
 * PATCH /api/pipeline/[id]
 * Update an opportunity
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateOpportunitySchema,
  },
  async (_request, _context, params, body) => {
    const opportunity = await PipelineService.updateOpportunity(params.id, body)
    return NextResponse.json(opportunity)
  }
)

/**
 * DELETE /api/pipeline/[id]
 * Delete an opportunity
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, _context, params) => {
    await PipelineService.deleteOpportunity(params.id)
    return NextResponse.json({ success: true })
  }
)
