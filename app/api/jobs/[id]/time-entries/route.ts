import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { createTimeEntrySchema } from '@/lib/validations/jobs'

/**
 * GET /api/jobs/[id]/time-entries
 * Get time entries for a job
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    const timeEntries = await JobCompletionService.getTimeEntries(params.id)
    return NextResponse.json(timeEntries)
  }
)

/**
 * POST /api/jobs/[id]/time-entries
 * Create a time entry for a job
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: createTimeEntrySchema,
  },
  async (_request, _context, params, body) => {
    const timeEntry = await JobCompletionService.createTimeEntry({
      job_id: params.id,
      ...body,
    })

    return NextResponse.json(timeEntry, { status: 201 })
  }
)
