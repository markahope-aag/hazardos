import { NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/services/google-calendar-service'
import { randomBytes } from 'crypto'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/integrations/google-calendar/connect
 * Get Google Calendar OAuth authorization URL
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    // Generate state token for CSRF protection
    const state = `${context.profile.organization_id}:${randomBytes(16).toString('hex')}`

    // Get authorization URL
    const authUrl = GoogleCalendarService.getAuthorizationUrl(state)

    const response = NextResponse.json({ url: authUrl })
    response.cookies.set('gcal_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
    })

    return response
  }
)
