import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createJobSchema, jobListQuerySchema } from '@/lib/validations/jobs'

export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: jobListQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const jobs = await JobsService.list({
      status: query.status,
      customer_id: query.customer_id,
      from_date: query.from_date,
      to_date: query.to_date,
      crew_member_id: query.crew_member_id,
    })
    return NextResponse.json(jobs)
  }
)

export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createJobSchema,
  },
  async (_request, _context, body, _query) => {
    const job = await JobsService.create(body)
    return NextResponse.json(job, { status: 201 })
  }
)
