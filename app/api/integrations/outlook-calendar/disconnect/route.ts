import { NextResponse } from 'next/server'
import { OutlookCalendarService } from '@/lib/services/outlook-calendar-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * POST /api/integrations/outlook-calendar/disconnect
 * Disconnect Outlook Calendar integration
 */
export const POST = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    await OutlookCalendarService.disconnect(context.profile.organization_id)
    return NextResponse.json({ success: true })
  }
)
