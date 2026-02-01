import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { checklistQuerySchema } from '@/lib/validations/jobs'

/**
 * GET /api/jobs/[id]/checklist
 * Get checklist for a job
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    querySchema: checklistQuerySchema,
  },
  async (_request, _context, params, _body, query) => {
    const grouped = query.grouped === 'true'

    if (grouped) {
      const checklist = await JobCompletionService.getChecklistGrouped(params.id)
      return NextResponse.json(checklist)
    }

    const checklist = await JobCompletionService.getChecklist(params.id)
    return NextResponse.json(checklist)
  }
)

/**
 * POST /api/jobs/[id]/checklist
 * Initialize default checklist for a job
 */
export const POST = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    const checklist = await JobCompletionService.initializeChecklist(params.id)
    return NextResponse.json(checklist, { status: 201 })
  }
)
