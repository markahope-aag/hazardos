import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/services/hubspot-service', () => ({
  HubSpotService: {
    exchangeCodeForTokens: vi.fn(),
    storeTokens: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/utils/logger', () => ({
  createRequestLogger: vi.fn(() => ({
    error: vi.fn(),
  })),
  formatError: vi.fn((error) => error),
}))

// Import after mocks
import { GET } from '@/app/api/integrations/hubspot/callback/route'
import { HubSpotService } from '@/lib/services/hubspot-service'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

describe('HubSpot OAuth Callback API', () => {
  beforeEach(() => {
    // Reset (not just clear) so mockResolvedValue() overrides from earlier
    // tests don't bleed into later ones — otherwise the 429 set by the
    // rate-limit test below makes every subsequent test short-circuit.
    vi.resetAllMocks()
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(null)

    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
  })

  it('should redirect with error when OAuth error parameter is present', async () => {
    const request = new NextRequest('http://localhost/api/integrations/hubspot/callback?error=access_denied')
    
    const response = await GET(request)
    
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(
      'https://example.com/settings/integrations?error=access_denied'
    )
  })

  it('should redirect with error when code is missing', async () => {
    const request = new NextRequest('http://localhost/api/integrations/hubspot/callback?state=org-123:timestamp')
    
    const response = await GET(request)
    
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(
      'https://example.com/settings/integrations?error=missing_params'
    )
  })

  it('should redirect with error when state is missing', async () => {
    const request = new NextRequest('http://localhost/api/integrations/hubspot/callback?code=auth_code_123')
    
    const response = await GET(request)
    
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(
      'https://example.com/settings/integrations?error=missing_params'
    )
  })

  it('should redirect with error when state does not match stored state', async () => {
    const request = new NextRequest('http://localhost/api/integrations/hubspot/callback?code=auth_code_123&state=invalid_state', {
      headers: {
        Cookie: 'hubspot_state=valid_state_123'
      }
    })
    
    const response = await GET(request)
    
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(
      'https://example.com/settings/integrations?error=invalid_state'
    )
  })

  it('should successfully exchange code for tokens and redirect', async () => {
    const mockTokens = {
      access_token: 'access_token_123',
      refresh_token: 'refresh_token_123',
      expires_in: 3600,
      token_type: 'bearer'
    }

    vi.mocked(HubSpotService.exchangeCodeForTokens).mockResolvedValue(mockTokens)
    vi.mocked(HubSpotService.storeTokens).mockResolvedValue()

    const state = 'org-123:timestamp'
    const request = new NextRequest(`http://localhost/api/integrations/hubspot/callback?code=auth_code_123&state=${state}`, {
      headers: {
        Cookie: `hubspot_state=${state}`
      }
    })
    
    const response = await GET(request)
    
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(
      'https://example.com/settings/integrations?success=hubspot'
    )
    
    // Verify service calls
    expect(HubSpotService.exchangeCodeForTokens).toHaveBeenCalledWith('auth_code_123')
    expect(HubSpotService.storeTokens).toHaveBeenCalledWith('org-123', mockTokens, 'pending')
    
    // Verify state cookie is cleared
    const setCookieHeader = response.headers.get('Set-Cookie')
    expect(setCookieHeader).toContain('hubspot_state=; Path=/')
  })

  it('should handle rate limiting', async () => {
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(
      new Response('Rate Limited', { status: 429 })
    )
    
    const request = new NextRequest('http://localhost/api/integrations/hubspot/callback?code=auth_code_123&state=org-123:timestamp')
    
    const response = await GET(request)
    
    expect(response.status).toBe(429)
  })

  it('should handle token exchange errors', async () => {
    vi.mocked(HubSpotService.exchangeCodeForTokens).mockRejectedValue(
      new Error('Token exchange failed')
    )

    const state = 'org-error:timestamp'
    const request = new NextRequest(`http://localhost/api/integrations/hubspot/callback?code=invalid_code&state=${state}`, {
      headers: {
        Cookie: `hubspot_state=${state}`
      }
    })
    
    const response = await GET(request)
    
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(
      'https://example.com/settings/integrations?error=callback_failed'
    )
  })

  it('should handle token storage errors', async () => {
    const mockTokens = {
      access_token: 'access_token_123',
      refresh_token: 'refresh_token_123',
      expires_in: 3600,
      token_type: 'bearer'
    }

    vi.mocked(HubSpotService.exchangeCodeForTokens).mockResolvedValue(mockTokens)
    vi.mocked(HubSpotService.storeTokens).mockRejectedValue(
      new Error('Database error')
    )

    const state = 'org-error:timestamp'
    const request = new NextRequest(`http://localhost/api/integrations/hubspot/callback?code=auth_code_123&state=${state}`, {
      headers: {
        Cookie: `hubspot_state=${state}`
      }
    })
    
    const response = await GET(request)
    
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(
      'https://example.com/settings/integrations?error=callback_failed'
    )
  })

  it('should handle missing hubspot_state cookie', async () => {
    const request = new NextRequest('http://localhost/api/integrations/hubspot/callback?code=auth_code_123&state=org-123:timestamp')
    // No cookie header
    
    const response = await GET(request)
    
    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe(
      'https://example.com/settings/integrations?error=invalid_state'
    )
  })

  it('should extract organization ID from state correctly', async () => {
    const mockTokens = {
      access_token: 'access_token_123',
      expires_in: 3600,
      token_type: 'bearer'
    }

    vi.mocked(HubSpotService.exchangeCodeForTokens).mockResolvedValue(mockTokens)
    vi.mocked(HubSpotService.storeTokens).mockResolvedValue()

    const state = 'org-complex-id-123:timestamp:extra:parts'
    const request = new NextRequest(`http://localhost/api/integrations/hubspot/callback?code=auth_code_123&state=${state}`, {
      headers: {
        Cookie: `hubspot_state=${state}`
      }
    })
    
    await GET(request)
    
    // Should extract only the first part before ':'
    expect(HubSpotService.storeTokens).toHaveBeenCalledWith('org-complex-id-123', mockTokens, 'pending')
  })
})