import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/sms/send/route'
import { SmsService } from '@/lib/services/sms-service'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/sms-service', () => ({
  SmsService: {
    send: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('POST /api/sms/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  it('should send SMS for authenticated user', async () => {
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

    const mockMessage = {
      id: 'msg-1',
      to: '+15551234567',
      body: 'Your appointment is tomorrow',
      status: 'sent',
      sid: 'SM123'
    }

    vi.mocked(SmsService.send).mockResolvedValue(mockMessage)

    const smsData = {
      to: '+15551234567',
      body: 'Your appointment is tomorrow',
      message_type: 'appointment_reminder'
    }

    const request = new NextRequest('http://localhost:3000/api/sms/send', {
      method: 'POST',
      body: JSON.stringify(smsData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual(mockMessage)
    expect(SmsService.send).toHaveBeenCalledWith('org-123', expect.objectContaining({
      to: '+15551234567',
      body: 'Your appointment is tomorrow',
      message_type: 'appointment_reminder'
    }))
  })

  it('should send SMS with customer and entity references', async () => {
    const CUSTOMER_UUID = '550e8400-e29b-41d4-a716-446655440001'
    const JOB_UUID = '550e8400-e29b-41d4-a716-446655440002'

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

    const mockMessage = {
      id: 'msg-2',
      to: '+15559876543',
      body: 'Job update',
      status: 'sent'
    }

    vi.mocked(SmsService.send).mockResolvedValue(mockMessage)

    const smsData = {
      to: '+15559876543',
      body: 'Job update',
      message_type: 'job_status',
      customer_id: CUSTOMER_UUID,
      related_entity_type: 'job',
      related_entity_id: JOB_UUID
    }

    const request = new NextRequest('http://localhost:3000/api/sms/send', {
      method: 'POST',
      body: JSON.stringify(smsData)
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(SmsService.send).toHaveBeenCalledWith('org-123', expect.objectContaining({
      customer_id: CUSTOMER_UUID,
      related_entity_type: 'job',
      related_entity_id: JOB_UUID
    }))
  })

  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })

    const smsData = {
      to: '+15551234567',
      body: 'Test message'
    }

    const request = new NextRequest('http://localhost:3000/api/sms/send', {
      method: 'POST',
      body: JSON.stringify(smsData)
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should handle SMS service errors', async () => {
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

    vi.mocked(SmsService.send).mockRejectedValue(new Error('Twilio API error'))

    const smsData = {
      to: '+15551234567',
      body: 'Test message',
      message_type: 'general'
    }

    const request = new NextRequest('http://localhost:3000/api/sms/send', {
      method: 'POST',
      body: JSON.stringify(smsData)
    })

    const response = await POST(request)

    expect(response.status).toBeGreaterThanOrEqual(400)
  })

  it('should validate phone number format', async () => {
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

    const smsData = {
      to: 'invalid',
      body: 'Test message',
      message_type: 'general'
    }

    const request = new NextRequest('http://localhost:3000/api/sms/send', {
      method: 'POST',
      body: JSON.stringify(smsData)
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})
