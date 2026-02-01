import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { availableCrewQuerySchema } from '@/lib/validations/jobs'
import { SecureError } from '@/lib/utils/secure-error-handler'

export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: availableCrewQuerySchema,
  },
  async (_request, _context, _body, query) => {
    if (!query.date) {
      throw new SecureError('VALIDATION_ERROR', 'date is required')
    }

    // Validate date format
    const checkDate = new Date(query.date)
    if (isNaN(checkDate.getTime())) {
      throw new SecureError('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD')
    }

    const crew = await JobsService.getAvailableCrew(query.date)
    return NextResponse.json(crew)
  }
)
