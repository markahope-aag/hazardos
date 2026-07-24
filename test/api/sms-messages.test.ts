import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/sms/messages/route'
import { SmsService } from '@/lib/services/sms-service'
import type { SmsMessage } from '@/types/sms'

const createMockSmsMessage = (overrides: Partial<SmsMessage> = {}): SmsMessage => ({
  id: 'msg-1',
  organization_id: 'org-123',
  customer_id: null,
  to_phone: '+15551234567',
  message_type: 'general',
  body: 'Test message',
  related_entity_type: null,
  related_entity_id: null,
  twilio_message_sid: null,
  status: 'delivered',
  error_code: null,
  error_message: null,
  queued_at: '2026-03-01T10:00:00Z',
  sent_at: null,
  delivered_at: null,
  failed_at: null,
  segments: 1,
  cost: null,
  ...overrides
})

vi.mock('@/lib/services/sms-service', () => ({
  SmsService: { getMessages: vi.fn() }
}))

vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    createApiHandler: (options: any, handler: any) => {
      return async (request: any) => {
        const mockContext = {
          user: { id: 'user-123' },
          profile: { organization_id: 'org-123', role: 'admin' },
          log: { info: vi.fn() },
          requestId: 'test-id'
        }
        const url = new URL(request.url)
        const query: any = {}
        url.searchParams.forEach((value, key) => { query[key] = value })
        return await handler(request, mockContext, {}, query)
      }
    }
  }
})

describe('SMS Messages API', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should list SMS messages', async () => {
    const mockMessages = [
      createMockSmsMessage({ id: 'msg-1', to_phone: '+15551234567', body: 'Test message', status: 'delivered' }),
      createMockSmsMessage({ id: 'msg-2', to_phone: '+15559876543', body: 'Another message', status: 'sent' })
    ]
    vi.mocked(SmsService.getMessages).mockResolvedValue(mockMessages)
    const request = new NextRequest('http://localhost:3000/api/sms/messages')
    const response = await GET(request)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
  })

  it('should filter messages by customer', async () => {
    vi.mocked(SmsService.getMessages).mockResolvedValue([])
    const request = new NextRequest('http://localhost:3000/api/sms/messages?customer_id=cust-123')
    await GET(request)
    expect(SmsService.getMessages).toHaveBeenCalledWith('org-123', expect.objectContaining({ customer_id: 'cust-123' }))
  })
})
