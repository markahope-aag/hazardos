import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/services/sms-service', () => ({
  SmsService: {
    updateMessageStatus: vi.fn(() => Promise.resolve()),
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
    maybeSingle: vi.fn().mockResolvedValue({ 
      data: { organization_id: 'org-123' }, 
      error: null 
    }),
  })),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Import after mocks
import { POST } from '@/app/api/webhooks/twilio/status/route'
import { SmsService } from '@/lib/services/sms-service'

describe('Twilio Status Webhook API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
  })

  it('should return 400 when MessageSid is missing', async () => {
    const formData = new FormData()
    formData.append('MessageStatus', 'delivered')
    
    const request = new NextRequest('http://localhost/api/webhooks/twilio/status', {
      method: 'POST',
      body: formData,
      headers: { 'X-Twilio-Signature': 'valid' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    
    const json = await response.json()
    expect(json.error).toBe('Missing MessageSid')
  })

  it('should return 401 when signature is missing', async () => {
    // Need to find message and settings for signature validation to be reached
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'sms_messages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ 
            data: { organization_id: 'org-123' }, 
            error: null 
          }),
        }
      }
      if (table === 'organization_sms_settings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ 
            data: { twilio_auth_token: 'org-token', use_platform_twilio: false }, 
            error: null 
          }),
        }
      }
      return mockSupabaseClient.from(table)
    })
    
    const formData = new FormData()
    formData.append('MessageSid', 'SM123')
    formData.append('MessageStatus', 'delivered')
    
    const request = new NextRequest('http://localhost/api/webhooks/twilio/status', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should successfully update message status', async () => {
    // Mock message and settings lookup
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'sms_messages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ 
            data: { organization_id: 'org-123' }, 
            error: null 
          }),
        }
      }
      if (table === 'organization_sms_settings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ 
            data: { twilio_auth_token: 'org-token', use_platform_twilio: false }, 
            error: null 
          }),
        }
      }
      return mockSupabaseClient.from(table)
    })

    const formData = new FormData()
    formData.append('MessageSid', 'SM123')
    formData.append('MessageStatus', 'delivered')
    
    const request = new NextRequest('http://localhost/api/webhooks/twilio/status', {
      method: 'POST',
      body: formData,
      headers: { 'X-Twilio-Signature': 'valid' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.success).toBe(true)
    
    expect(SmsService.updateMessageStatus).toHaveBeenCalledWith(
      'SM123', 
      'delivered', 
      undefined, 
      undefined
    )
  })

  it('should handle message not found gracefully', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'sms_messages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return mockSupabaseClient.from(table)
    })

    const formData = new FormData()
    formData.append('MessageSid', 'SM999')
    formData.append('MessageStatus', 'delivered')
    
    const request = new NextRequest('http://localhost/api/webhooks/twilio/status', {
      method: 'POST',
      body: formData,
      headers: { 'X-Twilio-Signature': 'valid' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.success).toBe(true)
  })

  it('should handle errors gracefully', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      throw new Error('Database error')
    })
    
    const formData = new FormData()
    formData.append('MessageSid', 'SM123')
    formData.append('MessageStatus', 'delivered')
    
    const request = new NextRequest('http://localhost/api/webhooks/twilio/status', {
      method: 'POST',
      body: formData,
      headers: { 'X-Twilio-Signature': 'valid' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.success).toBe(false)
  })
})
