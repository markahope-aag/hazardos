import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/webhooks/route'
import { WebhookService } from '@/lib/services/webhook-service'

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

vi.mock('@/lib/services/webhook-service', () => ({
  WebhookService: {
    list: vi.fn(),
    create: vi.fn(),
    generateSecret: vi.fn(() => 'generated-secret-123')
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Webhooks API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/webhooks', () => {
    it('should list webhooks for organization', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'admin@example.com' } },
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

      const mockWebhooks = [
        { id: 'webhook-1', url: 'https://example.com/webhook', events: ['job.created'] },
        { id: 'webhook-2', url: 'https://other.com/hook', events: ['invoice.paid'] }
      ]

      vi.mocked(WebhookService.list).mockResolvedValue(mockWebhooks)

      const request = new NextRequest('http://localhost:3000/api/webhooks')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.webhooks).toEqual(mockWebhooks)
      expect(WebhookService.list).toHaveBeenCalledWith('org-123')
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/webhooks')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/webhooks', () => {
    it('should create webhook with provided secret', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'admin@example.com' } },
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

      const mockWebhook = {
        id: 'webhook-1',
        url: 'https://example.com/webhook',
        events: ['job.created', 'job.completed'],
        secret: 'my-secret-key'
      }

      vi.mocked(WebhookService.create).mockResolvedValue(mockWebhook)

      const webhookData = {
        url: 'https://example.com/webhook',
        events: ['job.created', 'job.completed'],
        secret: 'my-secret-key'
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(webhookData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.webhook).toEqual(mockWebhook)
    })

    it('should generate secret if not provided', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'admin@example.com' } },
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

      const mockWebhook = {
        id: 'webhook-2',
        url: 'https://example.com/webhook',
        events: ['invoice.paid'],
        secret: 'generated-secret-123'
      }

      vi.mocked(WebhookService.create).mockResolvedValue(mockWebhook)

      const webhookData = {
        url: 'https://example.com/webhook',
        events: ['invoice.paid']
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(webhookData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(WebhookService.create).toHaveBeenCalledWith('org-123', expect.objectContaining({
        secret: 'generated-secret-123'
      }))
    })

    it('should validate webhook URL', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'admin@example.com' } },
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

      const webhookData = {
        url: 'not-a-valid-url',
        events: ['job.created']
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(webhookData)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should validate events array is not empty', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'admin@example.com' } },
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

      const webhookData = {
        url: 'https://example.com/webhook',
        events: []
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(webhookData)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})
