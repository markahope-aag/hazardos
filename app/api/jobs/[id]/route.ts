import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateJobSchema } from '@/lib/validations/jobs'
import { idParamSchema } from '@/lib/validations/common'
import { SecureError } from '@/lib/utils/secure-error-handler'

export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    const job = await JobsService.getById(params.id)

    if (!job) {
      throw new SecureError('NOT_FOUND', 'Job not found')
    }

    return NextResponse.json(job)
  }
)

export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateJobSchema,
  },
  async (_request, _context, params, body) => {
    const job = await JobsService.update(params.id, body)

    // Reschedule reminders if date changed
    if (body.scheduled_start_date) {
      await JobsService.rescheduleReminders(params.id)
    }

    return NextResponse.json(job)
  }
)

export const DELETE = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    await JobsService.delete(params.id)
    return NextResponse.json({ success: true })
  }
)
