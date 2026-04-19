import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/integrations/quickbooks/callback/route'
import { QuickBooksService } from '@/lib/services/quickbooks-service'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

vi.mock('@/lib/services/quickbooks-service', () => ({
  QuickBooksService: {
    exchangeCodeForTokens: vi.fn(),
    storeTokens: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn()
}))

// Set up environment variable
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

describe('QuickBooks Callback API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(null) // No rate limiting by default
  })

  it('should redirect with error when OAuth error parameter is present', async () => {
    const request = new NextRequest('http://localhost/api/integrations/quickbooks/callback?error=access_denied')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=access_denied')
  })

  it('should redirect with error when code is missing', async () => {
    const request = new NextRequest('http://localhost/api/integrations/quickbooks/callback?state=org-123:random-string&realmId=realm-123')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=missing_params')
  })

  it('should redirect with error when state is missing', async () => {
    const request = new NextRequest('http://localhost/api/integrations/quickbooks/callback?code=test-code&realmId=realm-123')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=missing_params')
  })

  it('should redirect with error when realmId is missing', async () => {
    const request = new NextRequest('http://localhost/api/integrations/quickbooks/callback?code=test-code&state=org-123:random-string')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=missing_params')
  })

  it('should redirect with error when state does not match stored state', async () => {
    const request = new NextRequest('http://localhost/api/integrations/quickbooks/callback?code=test-code&state=org-123:invalid-state&realmId=realm-123', {
      headers: {
        Cookie: 'qbo_state=org-123:different-state'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=invalid_state')
  })

  it('should successfully exchange code for tokens and redirect', async () => {
    const mockTokens = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600
    }

    vi.mocked(QuickBooksService.exchangeCodeForTokens).mockResolvedValue(mockTokens)
    vi.mocked(QuickBooksService.storeTokens).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/integrations/quickbooks/callback?code=test-code&state=org-123:valid-state&realmId=realm-123', {
      headers: {
        Cookie: 'qbo_state=org-123:valid-state'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?success=true')
    expect(vi.mocked(QuickBooksService.exchangeCodeForTokens)).toHaveBeenCalledWith('test-code')
    expect(vi.mocked(QuickBooksService.storeTokens)).toHaveBeenCalledWith('org-123', mockTokens, 'realm-123')

    // Check that state cookie is deleted
    const setCookieHeader = response.headers.get('Set-Cookie')
    expect(setCookieHeader).toContain('qbo_state=')
  })

  it('should handle rate limiting', async () => {
    const rateLimitResponse = new Response('Rate limited', { status: 429 })
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(rateLimitResponse)

    const request = new NextRequest('http://localhost/api/integrations/quickbooks/callback?code=test-code&state=org-123:valid-state&realmId=realm-123')

    const response = await GET(request)

    expect(response.status).toBe(429)
  })

  it('should handle token exchange errors', async () => {
    vi.mocked(QuickBooksService.exchangeCodeForTokens).mockRejectedValue(new Error('Token exchange failed'))

    const request = new NextRequest('http://localhost/api/integrations/quickbooks/callback?code=test-code&state=org-123:valid-state&realmId=realm-123', {
      headers: {
        Cookie: 'qbo_state=org-123:valid-state'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=callback_failed')
  })

  it('should handle token storage errors', async () => {
    const mockTokens = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token'
    }

    vi.mocked(QuickBooksService.exchangeCodeForTokens).mockResolvedValue(mockTokens)
    vi.mocked(QuickBooksService.storeTokens).mockRejectedValue(new Error('Storage failed'))

    const request = new NextRequest('http://localhost/api/integrations/quickbooks/callback?code=test-code&state=org-123:valid-state&realmId=realm-123', {
      headers: {
        Cookie: 'qbo_state=org-123:valid-state'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=callback_failed')
  })

  it('should handle missing qbo_state cookie', async () => {
    const request = new NextRequest('http://localhost/api/integrations/quickbooks/callback?code=test-code&state=org-123:valid-state&realmId=realm-123')
    // No cookie header - missing state cookie

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=invalid_state')
  })

  it('should extract organization ID from state correctly', async () => {
    const mockTokens = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token'
    }

    vi.mocked(QuickBooksService.exchangeCodeForTokens).mockResolvedValue(mockTokens)
    vi.mocked(QuickBooksService.storeTokens).mockResolvedValue(undefined)

    const organizationId = 'special-org-456'
    const state = `${organizationId}:random-state-string`

    const request = new NextRequest(`http://localhost/api/integrations/quickbooks/callback?code=test-code&state=${state}&realmId=realm-456`, {
      headers: {
        Cookie: `qbo_state=${state}`
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(vi.mocked(QuickBooksService.storeTokens)).toHaveBeenCalledWith(organizationId, mockTokens, 'realm-456')
  })
})