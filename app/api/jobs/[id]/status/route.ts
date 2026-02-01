import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateJobStatusSchema } from '@/lib/validations/jobs'

export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateJobStatusSchema,
  },
  async (_request, _context, params, body) => {
    const job = await JobsService.updateStatus(params.id, body.status)
    return NextResponse.json(job)
  }
)
