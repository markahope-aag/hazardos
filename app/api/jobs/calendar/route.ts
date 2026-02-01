import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { calendarQuerySchema } from '@/lib/validations/jobs'
import { SecureError } from '@/lib/utils/secure-error-handler'

export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: calendarQuerySchema,
  },
  async (_request, _context, _body, query) => {
    if (!query.start || !query.end) {
      throw new SecureError('VALIDATION_ERROR', 'start and end dates are required')
    }

    // Validate date format
    const startDate = new Date(query.start)
    const endDate = new Date(query.end)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new SecureError('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD')
    }

    const jobs = await JobsService.getCalendarEvents(query.start, query.end)
    return NextResponse.json(jobs)
  }
)
