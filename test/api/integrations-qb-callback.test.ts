import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock QuickBooksService
vi.mock('@/lib/services/quickbooks-service', () => ({
  QuickBooksService: {
    exchangeCodeForTokens: vi.fn(),
    storeTokens: vi.fn()
  }
}))

// Import the route handler
import { GET } from '@/app/api/integrations/quickbooks/callback/route'
import { QuickBooksService } from '@/lib/services/quickbooks-service'

describe('QuickBooks Callback API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  describe('GET /api/integrations/quickbooks/callback', () => {
    it('should handle successful OAuth callback', async () => {
      const mockTokens = {
        access_token: 'qb-access-token',
        refresh_token: 'qb-refresh-token',
        expires_in: 3600,
        token_type: 'bearer'
      }

      mockQuickBooksService.exchangeCodeForTokens.mockResolvedValue(mockTokens)
      mockQuickBooksService.storeTokens.mockResolvedValue(undefined)

      const state = 'org-123:random-string'
      const request = new NextRequest(
        `http://localhost:3000/api/integrations/quickbooks/callback?code=auth-code&state=${state}&realmId=realm-123`,
        {
          headers: {
            cookie: `qbo_state=${state}`
          }
        }
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/settings/integrations?success=true')
      expect(mockQuickBooksService.exchangeCodeForTokens).toHaveBeenCalledWith('auth-code')
      expect(mockQuickBooksService.storeTokens).toHaveBeenCalledWith('org-123', mockTokens, 'realm-123')
    })

    it('should redirect with error when OAuth error parameter present', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/integrations/quickbooks/callback?error=access_denied'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/settings/integrations?error=access_denied')
      expect(mockQuickBooksService.exchangeCodeForTokens).not.toHaveBeenCalled()
    })

    it('should redirect with error when code is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/integrations/quickbooks/callback?state=org-123:random&realmId=realm-123'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/settings/integrations?error=missing_params')
    })

    it('should redirect with error when state is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/integrations/quickbooks/callback?code=auth-code&realmId=realm-123'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/settings/integrations?error=missing_params')
    })

    it('should redirect with error when realmId is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/integrations/quickbooks/callback?code=auth-code&state=org-123:random'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/settings/integrations?error=missing_params')
    })

    it('should redirect with error when state does not match', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/integrations/quickbooks/callback?code=auth-code&state=org-123:random&realmId=realm-123',
        {
          headers: {
            cookie: 'qbo_state=different-state'
          }
        }
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/settings/integrations?error=invalid_state')
    })

    it('should redirect with error when state cookie is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/integrations/quickbooks/callback?code=auth-code&state=org-123:random&realmId=realm-123'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/settings/integrations?error=invalid_state')
    })

    it('should extract organization ID from state', async () => {
      const mockTokens = {
        access_token: 'qb-access-token',
        refresh_token: 'qb-refresh-token',
        expires_in: 3600,
        token_type: 'bearer'
      }

      mockQuickBooksService.exchangeCodeForTokens.mockResolvedValue(mockTokens)
      mockQuickBooksService.storeTokens.mockResolvedValue(undefined)

      const state = 'org-abc-def:random-string'
      const request = new NextRequest(
        `http://localhost:3000/api/integrations/quickbooks/callback?code=auth-code&state=${state}&realmId=realm-123`,
        {
          headers: {
            cookie: `qbo_state=${state}`
          }
        }
      )

      await GET(request)

      expect(mockQuickBooksService.storeTokens).toHaveBeenCalledWith('org-abc-def', mockTokens, 'realm-123')
    })

    it('should clear state cookie after successful callback', async () => {
      const mockTokens = {
        access_token: 'qb-access-token',
        refresh_token: 'qb-refresh-token',
        expires_in: 3600,
        token_type: 'bearer'
      }

      mockQuickBooksService.exchangeCodeForTokens.mockResolvedValue(mockTokens)
      mockQuickBooksService.storeTokens.mockResolvedValue(undefined)

      const state = 'org-123:random-string'
      const request = new NextRequest(
        `http://localhost:3000/api/integrations/quickbooks/callback?code=auth-code&state=${state}&realmId=realm-123`,
        {
          headers: {
            cookie: `qbo_state=${state}`
          }
        }
      )

      const response = await GET(request)

      // Check that the cookie was deleted
      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('qbo_state=')
      expect(setCookieHeader).toContain('Max-Age=0')
    })

    it('should handle token exchange errors', async () => {
      mockQuickBooksService.exchangeCodeForTokens.mockRejectedValue(
        new Error('Token exchange failed')
      )

      const state = 'org-123:random-string'
      const request = new NextRequest(
        `http://localhost:3000/api/integrations/quickbooks/callback?code=auth-code&state=${state}&realmId=realm-123`,
        {
          headers: {
            cookie: `qbo_state=${state}`
          }
        }
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/settings/integrations?error=callback_failed')
    })

    it('should handle token storage errors', async () => {
      const mockTokens = {
        access_token: 'qb-access-token',
        refresh_token: 'qb-refresh-token',
        expires_in: 3600,
        token_type: 'bearer'
      }

      mockQuickBooksService.exchangeCodeForTokens.mockResolvedValue(mockTokens)
      mockQuickBooksService.storeTokens.mockRejectedValue(
        new Error('Database error')
      )

      const state = 'org-123:random-string'
      const request = new NextRequest(
        `http://localhost:3000/api/integrations/quickbooks/callback?code=auth-code&state=${state}&realmId=realm-123`,
        {
          headers: {
            cookie: `qbo_state=${state}`
          }
        }
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/settings/integrations?error=callback_failed')
    })

    it('should use NEXT_PUBLIC_APP_URL for redirect', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'

      const request = new NextRequest(
        'http://localhost:3000/api/integrations/quickbooks/callback?error=access_denied'
      )

      const response = await GET(request)

      expect(response.headers.get('location')).toContain('https://example.com/settings/integrations')

      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    })

    it('should handle state with multiple colons', async () => {
      const mockTokens = {
        access_token: 'qb-access-token',
        refresh_token: 'qb-refresh-token',
        expires_in: 3600,
        token_type: 'bearer'
      }

      mockQuickBooksService.exchangeCodeForTokens.mockResolvedValue(mockTokens)
      mockQuickBooksService.storeTokens.mockResolvedValue(undefined)

      const state = 'org-123:random:string:with:colons'
      const request = new NextRequest(
        `http://localhost:3000/api/integrations/quickbooks/callback?code=auth-code&state=${state}&realmId=realm-123`,
        {
          headers: {
            cookie: `qbo_state=${state}`
          }
        }
      )

      await GET(request)

      // Should extract only the first part before the first colon
      expect(mockQuickBooksService.storeTokens).toHaveBeenCalledWith('org-123', mockTokens, 'realm-123')
    })
  })
})
