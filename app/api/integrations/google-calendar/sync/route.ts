import { NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/services/google-calendar-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { z } from 'zod'

const googleCalendarSyncSchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  calendar_id: z.string().optional(),
})

/**
 * POST /api/integrations/google-calendar/sync
 * Sync a job to Google Calendar
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: googleCalendarSyncSchema,
  },
  async (_request, context, body) => {
    if (!body.job_id) {
      throw new SecureError('VALIDATION_ERROR', 'job_id is required', 'job_id')
    }

    const eventId = await GoogleCalendarService.syncJobToCalendar(
      context.profile.organization_id,
      body.job_id,
      body.calendar_id || 'primary'
    )

    return NextResponse.json({ success: true, event_id: eventId })
  }
)
