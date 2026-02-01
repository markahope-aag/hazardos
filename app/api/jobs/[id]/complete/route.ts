import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import {
  completionQuerySchema,
  createCompletionSchema,
  updateCompletionSchema,
} from '@/lib/validations/jobs'

/**
 * GET /api/jobs/[id]/complete
 * Get completion info for a job
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    querySchema: completionQuerySchema,
  },
  async (_request, _context, params, _body, query) => {
    const summary = query.summary === 'true'

    if (summary) {
      const completionSummary = await JobCompletionService.getCompletionSummary(params.id)
      return NextResponse.json(completionSummary)
    }

    const completion = await JobCompletionService.getCompletion(params.id)
    return NextResponse.json(completion)
  }
)

/**
 * POST /api/jobs/[id]/complete
 * Create or submit a completion
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: createCompletionSchema,
  },
  async (_request, _context, params, body) => {
    // If submit flag is set, submit the completion
    if (body.submit) {
      const completion = await JobCompletionService.submitCompletion(params.id, {
        field_notes: body.field_notes,
        issues_encountered: body.issues_encountered,
        recommendations: body.recommendations,
      })
      return NextResponse.json(completion)
    }

    // Create or get completion
    const completion = await JobCompletionService.createCompletion({
      job_id: params.id,
      estimated_hours: body.estimated_hours,
      estimated_material_cost: body.estimated_material_cost,
      estimated_total: body.estimated_total,
      field_notes: body.field_notes,
      issues_encountered: body.issues_encountered,
      recommendations: body.recommendations,
    })

    return NextResponse.json(completion, { status: 201 })
  }
)

/**
 * PATCH /api/jobs/[id]/complete
 * Update a completion
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateCompletionSchema,
  },
  async (_request, _context, params, body) => {
    const completion = await JobCompletionService.updateCompletion(params.id, body)
    return NextResponse.json(completion)
  }
)
