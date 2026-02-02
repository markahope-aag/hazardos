import { NextResponse } from 'next/server'
import { HubSpotService } from '@/lib/services/hubspot-service'
import { randomBytes } from 'crypto'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/integrations/hubspot/connect
 * Get HubSpot OAuth authorization URL
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    // Generate state token for CSRF protection
    const state = `${context.profile.organization_id}:${randomBytes(16).toString('hex')}`

    // Get authorization URL
    const authUrl = HubSpotService.getAuthorizationUrl(state)

    const response = NextResponse.json({ url: authUrl })
    response.cookies.set('hubspot_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })

    return response
  }
)
