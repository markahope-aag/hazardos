import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { GoogleCalendarService } from '@/lib/services/google-calendar-service'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { createServiceLogger, formatError } from '@/lib/utils/logger'

const log = createServiceLogger('calendar-external-events')

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start must be YYYY-MM-DD'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end must be YYYY-MM-DD'),
})

// Returns external calendar events (currently Google only) for the current
// user's org in the given date range. Events that HazardOS pushed to Google
// itself (jobs) are excluded so the in-app calendar doesn't double-render
// them alongside the job row.
//
// When Google isn't connected, returns `{ google: [] }` — a 200 with empty
// results, not an error — so the calendar view can render jobs alone without
// paying attention to integration state.
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema,
  },
  async (_request, context, _body, query) => {
    if (!query.start || !query.end) {
      throw new SecureError('VALIDATION_ERROR', 'start and end are required')
    }

    let googleEvents: Awaited<ReturnType<typeof GoogleCalendarService.listEventsInRange>> = []

    try {
      googleEvents = await GoogleCalendarService.listEventsInRange(
        context.profile.organization_id,
        query.start,
        query.end,
      )
    } catch (e) {
      // Don't fail the in-app calendar on a Google outage — log and continue
      // with an empty list.
      log.warn(
        { err: formatError(e), org: context.profile.organization_id },
        'Failed to list Google events',
      )
      googleEvents = []
    }

    return NextResponse.json({
      google: googleEvents || [],
    })
  },
)
