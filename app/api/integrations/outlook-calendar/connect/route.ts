import { NextResponse } from 'next/server'
import { OutlookCalendarService } from '@/lib/services/outlook-calendar-service'
import { randomBytes } from 'crypto'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/integrations/outlook-calendar/connect
 * Get Outlook Calendar OAuth authorization URL
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    // Generate state token for CSRF protection
    const state = `${context.profile.organization_id}:${randomBytes(16).toString('hex')}`

    // Get authorization URL
    const authUrl = OutlookCalendarService.getAuthorizationUrl(state)

    const response = NextResponse.json({ url: authUrl })
    response.cookies.set('outlook_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
    })

    return response
  }
)
