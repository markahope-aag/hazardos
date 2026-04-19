import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/services/sms-service', () => ({
  SmsService: {
    handleInboundKeyword: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('twilio', () => ({
  default: {
    validateRequest: vi.fn(() => true),
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  createRequestLogger: vi.fn(() => ({
    warn: vi.fn(),
    error: vi.fn(),
  })),
  formatError: vi.fn((error) => error),
}))

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Import after mocks
import { POST } from '@/app/api/webhooks/twilio/inbound/route'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

describe('Twilio Inbound Webhook API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token'
    process.env.TWILIO_PHONE_NUMBER = '+15551234567'
  })

  it('should return 400 when To number is missing', async () => {
    const formData = new FormData()
    formData.append('From', '+15559876543')
    formData.append('Body', 'Hello')
    
    const request = new NextRequest('http://localhost/api/webhooks/twilio/inbound', {
      method: 'POST',
      body: formData,
      headers: { 'X-Twilio-Signature': 'valid' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should return 401 when signature is missing', async () => {
    // Reset rate limiting mock for this test
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(null)
    
    // Mock finding an organization so signature validation is reached
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'organization_sms_settings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ 
            data: { 
              organization_id: 'org-123', 
              twilio_auth_token: 'test-token',
              use_platform_twilio: false 
            }, 
            error: null 
          }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    })
    
    const formData = new FormData()
    formData.append('To', '+15551234567')
    formData.append('From', '+15559876543')
    
    const request = new NextRequest('http://localhost/api/webhooks/twilio/inbound', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should handle rate limiting', async () => {
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(
      new Response('Rate Limited', { status: 429 })
    )
    
    const formData = new FormData()
    const request = new NextRequest('http://localhost/api/webhooks/twilio/inbound', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(429)
  })

  it('should return empty TwiML when no organization resolved', async () => {
    // Reset rate limiting mock for this test
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(null)
    
    const formData = new FormData()
    formData.append('To', '+15559999999') // Unknown number
    formData.append('From', '+15559876543')
    
    const request = new NextRequest('http://localhost/api/webhooks/twilio/inbound', {
      method: 'POST',
      body: formData,
      headers: { 'X-Twilio-Signature': 'valid' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/xml')
  })

  it('should handle errors gracefully', async () => {
    // Reset rate limiting mock for this test
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(null)
    
    mockSupabaseClient.from.mockImplementation(() => {
      throw new Error('Database error')
    })
    
    const formData = new FormData()
    formData.append('To', '+15551234567')
    formData.append('From', '+15559876543')
    
    const request = new NextRequest('http://localhost/api/webhooks/twilio/inbound', {
      method: 'POST',
      body: formData,
      headers: { 'X-Twilio-Signature': 'valid' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/xml')
  })
})
