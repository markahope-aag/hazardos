import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createJobSchema, jobListQuerySchema } from '@/lib/validations/jobs'

/**
 * GET /api/jobs
 * List jobs with optional filters
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: jobListQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const filters = {
      status: query.status || undefined,
      customer_id: query.customer_id || undefined,
      from_date: query.from_date || undefined,
      to_date: query.to_date || undefined,
      crew_member_id: query.crew_member_id || undefined,
    }

    const jobs = await JobsService.list(filters)
    return NextResponse.json(jobs)
  }
)

/**
 * POST /api/jobs
 * Create a new job
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createJobSchema,
  },
  async (_request, _context, body) => {
    const job = await JobsService.create(body)
    return NextResponse.json(job, { status: 201 })
  }
)
