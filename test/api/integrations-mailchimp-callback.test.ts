import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/integrations/mailchimp/callback/route'
import { MailchimpService } from '@/lib/services/mailchimp-service'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

vi.mock('@/lib/services/mailchimp-service', () => ({
  MailchimpService: {
    exchangeCodeForTokens: vi.fn(),
    getAccountMetadata: vi.fn(),
    storeTokens: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn()
}))

vi.mock('@/lib/utils/logger', () => ({
  createRequestLogger: vi.fn(() => ({
    error: vi.fn()
  })),
  formatError: vi.fn((error) => error)
}))

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123')
  }
})

// Set up environment variable
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

describe('Mailchimp Callback API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(null) // No rate limiting by default
  })

  it('should redirect with error when OAuth error parameter is present', async () => {
    const request = new NextRequest('http://localhost/api/integrations/mailchimp/callback?error=access_denied')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=access_denied')
  })

  it('should redirect with error when code is missing', async () => {
    const request = new NextRequest('http://localhost/api/integrations/mailchimp/callback?state=org-123:random-string')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=missing_params')
  })

  it('should redirect with error when state is missing', async () => {
    const request = new NextRequest('http://localhost/api/integrations/mailchimp/callback?code=test-code')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=missing_params')
  })

  it('should redirect with error when state does not match stored state', async () => {
    const request = new NextRequest('http://localhost/api/integrations/mailchimp/callback?code=test-code&state=org-123:invalid-state', {
      headers: {
        Cookie: 'mailchimp_state=org-123:different-state'
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

    const mockMetadata = {
      dc: 'us1',
      account_name: 'Test Account'
    }

    vi.mocked(MailchimpService).exchangeCodeForTokens.mockResolvedValue(mockTokens)
    vi.mocked(MailchimpService).getAccountMetadata.mockResolvedValue(mockMetadata)
    vi.mocked(MailchimpService).storeTokens.mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost/api/integrations/mailchimp/callback?code=test-code&state=org-123:valid-state', {
      headers: {
        Cookie: 'mailchimp_state=org-123:valid-state'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?success=mailchimp')
    expect(vi.mocked(MailchimpService).exchangeCodeForTokens).toHaveBeenCalledWith('test-code')
    expect(vi.mocked(MailchimpService).getAccountMetadata).toHaveBeenCalledWith('test-access-token')
    expect(vi.mocked(MailchimpService).storeTokens).toHaveBeenCalledWith('org-123', mockTokens, mockMetadata)

    // Check that state cookie is deleted
    const setCookieHeader = response.headers.get('Set-Cookie')
    expect(setCookieHeader).toContain('mailchimp_state=')
  })

  it('should handle rate limiting', async () => {
    const rateLimitResponse = new Response('Rate limited', { status: 429 })
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(rateLimitResponse)

    const request = new NextRequest('http://localhost/api/integrations/mailchimp/callback?code=test-code&state=org-123:valid-state')

    const response = await GET(request)

    expect(response.status).toBe(429)
  })

  it('should handle token exchange errors', async () => {
    vi.mocked(MailchimpService).exchangeCodeForTokens.mockRejectedValue(new Error('Token exchange failed'))

    const request = new NextRequest('http://localhost/api/integrations/mailchimp/callback?code=test-code&state=org-123:valid-state', {
      headers: {
        Cookie: 'mailchimp_state=org-123:valid-state'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=callback_failed')
  })

  it('should handle metadata retrieval errors', async () => {
    const mockTokens = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token'
    }

    vi.mocked(MailchimpService).exchangeCodeForTokens.mockResolvedValue(mockTokens)
    vi.mocked(MailchimpService).getAccountMetadata.mockRejectedValue(new Error('Metadata failed'))

    const request = new NextRequest('http://localhost/api/integrations/mailchimp/callback?code=test-code&state=org-123:valid-state', {
      headers: {
        Cookie: 'mailchimp_state=org-123:valid-state'
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

    const mockMetadata = {
      dc: 'us1',
      account_name: 'Test Account'
    }

    vi.mocked(MailchimpService).exchangeCodeForTokens.mockResolvedValue(mockTokens)
    vi.mocked(MailchimpService).getAccountMetadata.mockResolvedValue(mockMetadata)
    vi.mocked(MailchimpService).storeTokens.mockRejectedValue(new Error('Storage failed'))

    const request = new NextRequest('http://localhost/api/integrations/mailchimp/callback?code=test-code&state=org-123:valid-state', {
      headers: {
        Cookie: 'mailchimp_state=org-123:valid-state'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('http://localhost:3000/settings/integrations?error=callback_failed')
  })

  it('should handle missing mailchimp_state cookie', async () => {
    const request = new NextRequest('http://localhost/api/integrations/mailchimp/callback?code=test-code&state=org-123:valid-state')
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

    const mockMetadata = {
      dc: 'us1'
    }

    vi.mocked(MailchimpService).exchangeCodeForTokens.mockResolvedValue(mockTokens)
    vi.mocked(MailchimpService).getAccountMetadata.mockResolvedValue(mockMetadata)
    vi.mocked(MailchimpService).storeTokens.mockResolvedValue(undefined)

    const organizationId = 'special-org-456'
    const state = `${organizationId}:random-state-string`

    const request = new NextRequest(`http://localhost/api/integrations/mailchimp/callback?code=test-code&state=${state}`, {
      headers: {
        Cookie: `mailchimp_state=${state}`
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(vi.mocked(MailchimpService).storeTokens).toHaveBeenCalledWith(organizationId, mockTokens, mockMetadata)
  })
})