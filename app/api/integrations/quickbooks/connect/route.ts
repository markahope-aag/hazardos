import { NextResponse } from 'next/server'
import { QuickBooksService } from '@/lib/services/quickbooks-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { randomBytes } from 'crypto'

/**
 * GET /api/integrations/quickbooks/connect
 * Get QuickBooks authorization URL
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    // Generate state token for CSRF protection
    const state = `${context.profile.organization_id}:${randomBytes(16).toString('hex')}`

    // Store state in cookie for validation
    const authUrl = QuickBooksService.getAuthorizationUrl(state)

    const response = NextResponse.json({ url: authUrl })
    response.cookies.set('qbo_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })

    return response
  }
)
