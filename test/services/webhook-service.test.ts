import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to create mocks before vi.mock is processed
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  contains: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
}))

// Setup chainable mock
const setupChainableMock = () => {
  mockSupabase.from.mockReturnValue(mockSupabase)
  mockSupabase.select.mockReturnValue(mockSupabase)
  mockSupabase.insert.mockReturnValue(mockSupabase)
  mockSupabase.update.mockReturnValue(mockSupabase)
  mockSupabase.delete.mockReturnValue(mockSupabase)
  mockSupabase.eq.mockReturnValue(mockSupabase)
  mockSupabase.contains.mockReturnValue(mockSupabase)
  mockSupabase.order.mockReturnValue(mockSupabase)
  mockSupabase.limit.mockReturnValue(mockSupabase)
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Mock global fetch
global.fetch = vi.fn()

import { WebhookService } from '@/lib/services/webhook-service'

describe('WebhookService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupChainableMock()
  })

  describe('list', () => {
    it('should list all webhooks for organization', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          organization_id: 'org-1',
          name: 'Customer Events',
          url: 'https://example.com/webhook',
          events: ['customer.created', 'customer.updated'],
          is_active: true,
        },
        {
          id: 'webhook-2',
          organization_id: 'org-1',
          name: 'Job Events',
          url: 'https://example.com/jobs',
          events: ['job.created'],
          is_active: true,
        },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockWebhooks, error: null })

      const result = await WebhookService.list('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('webhooks')
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockWebhooks)
    })

    it('should return empty array when no webhooks found', async () => {
      mockSupabase.order.mockResolvedValue({ data: null, error: null })

      const result = await WebhookService.list('org-1')

      expect(result).toEqual([])
    })

    it('should handle database errors', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      })

      await expect(WebhookService.list('org-1')).rejects.toThrow('Query failed')
    })
  })

  describe('get', () => {
    it('should get webhook by id', async () => {
      const mockWebhook = {
        id: 'webhook-1',
        organization_id: 'org-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['customer.created'],
      }

      mockSupabase.single.mockResolvedValue({ data: mockWebhook, error: null })

      const result = await WebhookService.get('webhook-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('webhooks')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'webhook-1')
      expect(result).toEqual(mockWebhook)
    })

    it('should throw when webhook not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      await expect(WebhookService.get('non-existent')).rejects.toThrow('Not found')
    })
  })

  describe('create', () => {
    it('should create webhook successfully', async () => {
      const input = {
        name: 'Customer Webhook',
        url: 'https://example.com/webhook',
        events: ['customer.created', 'customer.updated'] as const,
        secret: 'secret123',
        headers: { 'X-Custom': 'value' },
      }

      const mockWebhook = {
        id: 'webhook-1',
        organization_id: 'org-1',
        ...input,
      }

      mockSupabase.single.mockResolvedValue({ data: mockWebhook, error: null })

      const result = await WebhookService.create('org-1', input)

      expect(mockSupabase.from).toHaveBeenCalledWith('webhooks')
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        organization_id: 'org-1',
        name: 'Customer Webhook',
        url: 'https://example.com/webhook',
        events: ['customer.created', 'customer.updated'],
        secret: 'secret123',
        headers: { 'X-Custom': 'value' },
      })
      expect(result).toEqual(mockWebhook)
    })

    it('should default headers to empty object if not provided', async () => {
      const input = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['job.created'] as const,
      }

      mockSupabase.single.mockResolvedValue({ data: {}, error: null })

      await WebhookService.create('org-1', input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {},
        })
      )
    })
  })

  describe('update', () => {
    it('should update webhook with provided fields', async () => {
      const updates = {
        name: 'Updated Webhook',
        url: 'https://new-url.com/webhook',
        is_active: false,
      }

      const mockUpdated = {
        id: 'webhook-1',
        ...updates,
        updated_at: expect.any(String),
      }

      mockSupabase.single.mockResolvedValue({ data: mockUpdated, error: null })

      const result = await WebhookService.update('webhook-1', updates)

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Webhook',
          url: 'https://new-url.com/webhook',
          is_active: false,
          updated_at: expect.any(String),
        })
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'webhook-1')
      expect(result).toEqual(mockUpdated)
    })

    it('should only update provided fields', async () => {
      const updates = {
        is_active: false,
      }

      mockSupabase.single.mockResolvedValue({ data: {}, error: null })

      await WebhookService.update('webhook-1', updates)

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
          updated_at: expect.any(String),
        })
      )
    })
  })

  describe('delete', () => {
    it('should delete webhook successfully', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null })

      await WebhookService.delete('webhook-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('webhooks')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'webhook-1')
    })

    it('should throw on delete error', async () => {
      mockSupabase.eq.mockResolvedValue({ error: { message: 'Delete failed' } })

      await expect(WebhookService.delete('webhook-1')).rejects.toThrow('Delete failed')
    })
  })

  describe('trigger', () => {
    it('should trigger webhooks subscribed to event', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          organization_id: 'org-1',
          url: 'https://example.com/webhook',
          events: ['customer.created'],
          is_active: true,
          failure_count: 0,
        },
      ]

      mockSupabase.contains.mockResolvedValue({ data: mockWebhooks, error: null })
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: 'delivery-1', attempt_count: 0 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'delivery-1', status: 'success' },
          error: null,
        })

      const mockFetch = vi.mocked(global.fetch)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      } as Response)

      await WebhookService.trigger('org-1', 'customer.created', {
        id: 'customer-1',
        name: 'John Doe',
      })

      expect(mockSupabase.contains).toHaveBeenCalledWith('events', ['customer.created'])
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should return early when no webhooks subscribed', async () => {
      mockSupabase.contains.mockResolvedValue({ data: [], error: null })

      await WebhookService.trigger('org-1', 'customer.created', {})

      expect(mockSupabase.from).toHaveBeenCalledWith('webhooks')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should not fail if one webhook delivery fails', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          url: 'https://example.com/webhook',
          is_active: true,
          failure_count: 0,
        },
      ]

      mockSupabase.contains.mockResolvedValue({ data: mockWebhooks, error: null })
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await WebhookService.trigger('org-1', 'customer.created', {})

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('getDeliveries', () => {
    it('should fetch delivery history for webhook', async () => {
      const mockDeliveries = [
        {
          id: 'delivery-1',
          webhook_id: 'webhook-1',
          event_type: 'customer.created',
          status: 'success',
          created_at: '2026-02-01T10:00:00Z',
        },
        {
          id: 'delivery-2',
          webhook_id: 'webhook-1',
          event_type: 'customer.updated',
          status: 'success',
          created_at: '2026-02-01T11:00:00Z',
        },
      ]

      mockSupabase.limit.mockResolvedValue({ data: mockDeliveries, error: null })

      const result = await WebhookService.getDeliveries('webhook-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_deliveries')
      expect(mockSupabase.eq).toHaveBeenCalledWith('webhook_id', 'webhook-1')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockSupabase.limit).toHaveBeenCalledWith(50)
      expect(result).toEqual(mockDeliveries)
    })

    it('should use custom limit when provided', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null })

      await WebhookService.getDeliveries('webhook-1', 100)

      expect(mockSupabase.limit).toHaveBeenCalledWith(100)
    })
  })

  describe('retryDelivery', () => {
    it('should retry failed delivery', async () => {
      const mockDelivery = {
        id: 'delivery-1',
        webhook_id: 'webhook-1',
        event_type: 'customer.created',
        payload: { id: 'customer-1' },
        attempt_count: 1,
      }

      const mockWebhook = {
        id: 'webhook-1',
        url: 'https://example.com/webhook',
        secret: 'secret123',
        headers: {},
        failure_count: 1,
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockDelivery, error: null })
        .mockResolvedValueOnce({ data: mockWebhook, error: null })
        .mockResolvedValueOnce({
          data: { ...mockDelivery, status: 'success' },
          error: null,
        })

      const mockFetch = vi.mocked(global.fetch)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      } as Response)

      const result = await WebhookService.retryDelivery('delivery-1')

      expect(result.status).toBe('success')
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should throw when delivery not found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null })

      await expect(WebhookService.retryDelivery('non-existent')).rejects.toThrow(
        'Delivery not found'
      )
    })

    it('should throw when webhook not found', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'delivery-1', webhook_id: 'webhook-1' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })

      await expect(WebhookService.retryDelivery('delivery-1')).rejects.toThrow('Webhook not found')
    })
  })

  describe('getAvailableEvents', () => {
    it('should return list of available webhook events', () => {
      const events = WebhookService.getAvailableEvents()

      expect(events).toBeInstanceOf(Array)
      expect(events.length).toBeGreaterThan(0)
      expect(events[0]).toHaveProperty('value')
      expect(events[0]).toHaveProperty('label')
      expect(events.some(e => e.value === 'customer.created')).toBe(true)
      expect(events.some(e => e.value === 'job.completed')).toBe(true)
    })
  })

  describe('generateSecret', () => {
    it('should generate webhook secret with whsec_ prefix', () => {
      const secret = WebhookService.generateSecret()

      expect(secret).toMatch(/^whsec_/)
      expect(secret.length).toBeGreaterThan(10)
    })

    it('should generate unique secrets', () => {
      const secret1 = WebhookService.generateSecret()
      const secret2 = WebhookService.generateSecret()

      expect(secret1).not.toBe(secret2)
    })
  })
})
