import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as ConnectGET } from '@/app/api/integrations/outlook-calendar/connect/route'
import { POST as DisconnectPOST } from '@/app/api/integrations/outlook-calendar/disconnect/route'
import { GET as CallbackGET } from '@/app/api/integrations/outlook-calendar/callback/route'

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/outlook-calendar-service', () => ({
  OutlookCalendarService: {
    getAuthorizationUrl: vi.fn(),
    disconnect: vi.fn(),
    exchangeCodeForTokens: vi.fn(),
    storeTokens: vi.fn(),
    getUserInfo: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { OutlookCalendarService } from '@/lib/services/outlook-calendar-service'

describe('Outlook Calendar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  describe('GET /api/integrations/outlook-calendar/connect', () => {
    it('should return OAuth authorization URL', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any)

      const authUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...'
      vi.mocked(OutlookCalendarService.getAuthorizationUrl).mockReturnValue(authUrl)

      const request = new NextRequest('http://localhost:3000/api/integrations/outlook-calendar/connect')

      // Act
      const response = await ConnectGET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.url).toBe(authUrl)
      expect(OutlookCalendarService.getAuthorizationUrl).toHaveBeenCalled()
    })

    it('should set outlook_state cookie with CSRF token', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any)

      vi.mocked(OutlookCalendarService.getAuthorizationUrl).mockReturnValue('https://outlook.com/auth')

      const request = new NextRequest('http://localhost:3000/api/integrations/outlook-calendar/connect')

      // Act
      const response = await ConnectGET(request)

      // Assert
      expect(response.status).toBe(200)
      expect(response.cookies.get('outlook_state')).toBeDefined()
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/integrations/outlook-calendar/connect')

      // Act
      const response = await ConnectGET(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/integrations/outlook-calendar/disconnect', () => {
    it('should disconnect Outlook Calendar integration', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any)

      vi.mocked(OutlookCalendarService.disconnect).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/integrations/outlook-calendar/disconnect', {
        method: 'POST'
      })

      // Act
      const response = await DisconnectPOST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(OutlookCalendarService.disconnect).toHaveBeenCalledWith('org-123')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/integrations/outlook-calendar/disconnect', {
        method: 'POST'
      })

      // Act
      const response = await DisconnectPOST(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/integrations/outlook-calendar/callback', () => {
    it('should exchange code for tokens and redirect on success', async () => {
      // Arrange
      const mockTokens = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        expires_in: 3600
      }

      const mockUserInfo = {
        email: 'user@outlook.com',
        name: 'Test User'
      }

      vi.mocked(OutlookCalendarService.exchangeCodeForTokens).mockResolvedValue(mockTokens)
      vi.mocked(OutlookCalendarService.storeTokens).mockResolvedValue(undefined)
      vi.mocked(OutlookCalendarService.getUserInfo).mockResolvedValue(mockUserInfo)

      const request = new NextRequest(
        'http://localhost:3000/api/integrations/outlook-calendar/callback?code=auth-code-123&state=org-123:random-state',
        {
          headers: {
            cookie: 'outlook_state=org-123:random-state'
          }
        }
      )

      // Act
      const response = await CallbackGET(request)

      // Assert
      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('success=outlook_calendar')
      expect(OutlookCalendarService.exchangeCodeForTokens).toHaveBeenCalledWith('auth-code-123')
      expect(OutlookCalendarService.storeTokens).toHaveBeenCalled()
    })

    it('should redirect with error when state mismatch', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/integrations/outlook-calendar/callback?code=auth-code-123&state=org-123:wrong-state',
        {
          headers: {
            cookie: 'outlook_state=org-123:correct-state'
          }
        }
      )

      // Act
      const response = await CallbackGET(request)

      // Assert
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('error=invalid_state')
    })

    it('should redirect with error when code missing', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/integrations/outlook-calendar/callback?state=org-123:state',
        {
          headers: {
            cookie: 'outlook_state=org-123:state'
          }
        }
      )

      // Act
      const response = await CallbackGET(request)

      // Assert
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('error=missing_params')
    })

    it('should redirect with error when OAuth error returned', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/integrations/outlook-calendar/callback?error=access_denied'
      )

      // Act
      const response = await CallbackGET(request)

      // Assert
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('error=access_denied')
    })

    it('should handle callback errors gracefully', async () => {
      // Arrange
      vi.mocked(OutlookCalendarService.exchangeCodeForTokens).mockRejectedValue(
        new Error('Token exchange failed')
      )

      const request = new NextRequest(
        'http://localhost:3000/api/integrations/outlook-calendar/callback?code=auth-code-123&state=org-123:random-state',
        {
          headers: {
            cookie: 'outlook_state=org-123:random-state'
          }
        }
      )

      // Act
      const response = await CallbackGET(request)

      // Assert
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('error=callback_failed')
    })
  })
})
