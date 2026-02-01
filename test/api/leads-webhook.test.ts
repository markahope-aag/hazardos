import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/leads/webhook/[slug]/route'
import { LeadWebhookService } from '@/lib/services/lead-webhook-service'

vi.mock('@/lib/services/lead-webhook-service', () => ({
  LeadWebhookService: {
    getBySlug: vi.fn(),
    processLead: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Lead Webhook API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/leads/webhook/[slug]', () => {
    it('should process lead webhook', async () => {
      const mockEndpoint = {
        id: 'endpoint-1',
        slug: 'test-slug',
        is_active: true,
        provider: 'generic'
      }

      vi.mocked(LeadWebhookService.getBySlug).mockResolvedValue(mockEndpoint)
      vi.mocked(LeadWebhookService.processLead).mockResolvedValue({
        success: true,
        customerId: 'customer-123'
      })

      const leadData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+15551234567'
      }

      const request = new NextRequest('http://localhost:3000/api/leads/webhook/test-slug', {
        method: 'POST',
        body: JSON.stringify(leadData)
      })

      const response = await POST(request, { params: Promise.resolve({ slug: 'test-slug' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.customer_id).toBe('customer-123')
    })

    it('should return 404 for unknown slug', async () => {
      vi.mocked(LeadWebhookService.getBySlug).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/leads/webhook/invalid-slug', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request, { params: Promise.resolve({ slug: 'invalid-slug' }) })

      expect(response.status).toBe(404)
    })

    it('should return 403 for disabled endpoint', async () => {
      const mockEndpoint = {
        id: 'endpoint-1',
        slug: 'disabled-slug',
        is_active: false,
        provider: 'generic'
      }

      vi.mocked(LeadWebhookService.getBySlug).mockResolvedValue(mockEndpoint)

      const request = new NextRequest('http://localhost:3000/api/leads/webhook/disabled-slug', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request, { params: Promise.resolve({ slug: 'disabled-slug' }) })

      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/leads/webhook/[slug]', () => {
    it('should return endpoint status', async () => {
      const mockEndpoint = {
        id: 'endpoint-1',
        slug: 'test-slug',
        is_active: true,
        provider: 'google'
      }

      vi.mocked(LeadWebhookService.getBySlug).mockResolvedValue(mockEndpoint)

      const request = new NextRequest('http://localhost:3000/api/leads/webhook/test-slug')
      const response = await GET(request, { params: Promise.resolve({ slug: 'test-slug' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('active')
      expect(data.provider).toBe('google')
    })
  })
})
