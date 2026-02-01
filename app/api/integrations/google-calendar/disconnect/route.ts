import { NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/services/google-calendar-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * POST /api/integrations/google-calendar/disconnect
 * Disconnect Google Calendar integration
 */
export const POST = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    await GoogleCalendarService.disconnect(context.profile.organization_id)
    return NextResponse.json({ success: true })
  }
)
