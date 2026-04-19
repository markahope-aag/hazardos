import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '@/app/api/webhooks/[id]/route'
import { WebhookService } from '@/lib/services/webhook-service'

vi.mock('@/lib/services/webhook-service', () => ({
  WebhookService: {
    get: vi.fn(),
    getDeliveries: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    createApiHandlerWithParams: (options: any, handler: any) => {
      return async (request: any, params: any) => {
        const mockContext = {
          user: { id: 'user-123' },
          profile: { organization_id: 'org-123', role: 'admin' },
          log: { info: vi.fn(), error: vi.fn() }
        }
        
        // Parse request body if present
        let body = {}
        if (request.body) {
          try {
            const bodyText = await request.text()
            body = JSON.parse(bodyText)
          } catch {
            // ignore
          }
        }
        
        return await handler(request, mockContext, await params.params, body)
      }
    }
  }
})

describe('Webhooks ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockParams = { params: Promise.resolve({ id: 'webhook-123' }) }

  describe('GET /api/webhooks/[id]', () => {
    it('should get webhook with deliveries', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        url: 'https://example.com/webhook',
        events: ['job.created', 'job.completed'],
        active: true,
        created_at: '2024-01-01T00:00:00Z'
      }

      const mockDeliveries = [
        {
          id: 'delivery-1',
          webhook_id: 'webhook-123',
          event: 'job.created',
          status: 'success',
          response_code: 200,
          created_at: '2024-01-01T10:00:00Z'
        }
      ]

      vi.mocked(WebhookService.get).mockResolvedValue(mockWebhook)
      vi.mocked(WebhookService.getDeliveries).mockResolvedValue(mockDeliveries)

      const request = new NextRequest('http://localhost/api/webhooks/webhook-123')
      const response = await GET(request, mockParams)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.webhook).toEqual(mockWebhook)
      expect(json.deliveries).toEqual(mockDeliveries)
      expect(WebhookService.get).toHaveBeenCalledWith('webhook-123')
      expect(WebhookService.getDeliveries).toHaveBeenCalledWith('webhook-123')
    })

    it('should return 404 when webhook not found', async () => {
      vi.mocked(WebhookService.get).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/webhooks/webhook-123')

      await expect(async () => {
        await GET(request, mockParams)
      }).rejects.toThrow('Webhook not found')
    })
  })

  describe('PUT /api/webhooks/[id]', () => {
    it('should update webhook successfully', async () => {
      const updateData = {
        url: 'https://example.com/new-webhook',
        events: ['job.created'],
        active: false
      }

      const updatedWebhook = {
        id: 'webhook-123',
        url: 'https://example.com/new-webhook',
        events: ['job.created'],
        active: false,
        updated_at: '2024-01-01T12:00:00Z'
      }

      vi.mocked(WebhookService.update).mockResolvedValue(updatedWebhook)

      const request = new NextRequest('http://localhost/api/webhooks/webhook-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request, mockParams)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.webhook).toEqual(updatedWebhook)
      expect(WebhookService.update).toHaveBeenCalledWith('webhook-123', updateData)
    })

    it('should handle update errors', async () => {
      vi.mocked(WebhookService.update).mockRejectedValue(new Error('Webhook not found'))

      const updateData = {
        url: 'https://example.com/webhook',
        active: true
      }

      const request = new NextRequest('http://localhost/api/webhooks/webhook-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      await expect(async () => {
        await PUT(request, mockParams)
      }).rejects.toThrow('Webhook not found')
    })
  })

  describe('DELETE /api/webhooks/[id]', () => {
    it('should delete webhook successfully', async () => {
      vi.mocked(WebhookService.delete).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/webhooks/webhook-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, mockParams)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(WebhookService.delete).toHaveBeenCalledWith('webhook-123')
    })

    it('should handle delete errors', async () => {
      vi.mocked(WebhookService.delete).mockRejectedValue(new Error('Webhook not found'))

      const request = new NextRequest('http://localhost/api/webhooks/webhook-123', {
        method: 'DELETE'
      })

      await expect(async () => {
        await DELETE(request, mockParams)
      }).rejects.toThrow('Webhook not found')
    })
  })
})
