import { describe, it, expect } from 'vitest'
import { 
  webhookEventTypeSchema,
  createWebhookSchema,
  updateWebhookSchema
} from '@/lib/validations/webhooks'

describe('webhooks validations', () => {
  describe('webhookEventTypeSchema', () => {
    const validEventTypes = [
      'customer.created',
      'customer.updated',
      'job.created',
      'job.updated',
      'job.completed',
      'invoice.created',
      'invoice.paid',
      'proposal.created',
      'proposal.signed',
      'estimate.approved'
    ]

    it('should validate all valid event types', () => {
      for (const eventType of validEventTypes) {
        const result = webhookEventTypeSchema.safeParse(eventType)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(eventType)
        }
      }
    })

    it('should reject invalid event type', () => {
      const result = webhookEventTypeSchema.safeParse('invalid.event')
      expect(result.success).toBe(false)
    })
  })

  describe('createWebhookSchema', () => {
    it('should validate minimal webhook creation', () => {
      const validData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['customer.created']
      }
      
      const result = createWebhookSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Test Webhook')
        expect(result.data.url).toBe('https://example.com/webhook')
        expect(result.data.events).toEqual(['customer.created'])
      }
    })

    it('should validate complete webhook creation', () => {
      const validData = {
        name: 'Complete Webhook',
        url: 'https://api.example.com/webhooks/hazardos',
        events: ['customer.created', 'job.completed'],
        secret: 'webhook-secret-key',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value'
        }
      }
      
      const result = createWebhookSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Complete Webhook')
        expect(result.data.url).toBe('https://api.example.com/webhooks/hazardos')
        expect(result.data.events).toEqual(['customer.created', 'job.completed'])
        expect(result.data.secret).toBe('webhook-secret-key')
        expect(result.data.headers).toEqual({
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value'
        })
      }
    })

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        url: 'https://example.com/webhook',
        events: ['customer.created']
      }
      
      const result = createWebhookSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject name too long', () => {
      const invalidData = {
        name: 'a'.repeat(256),
        url: 'https://example.com/webhook',
        events: ['customer.created']
      }
      
      const result = createWebhookSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid URL', () => {
      const invalidData = {
        name: 'Test Webhook',
        url: 'not-a-valid-url',
        events: ['customer.created']
      }
      
      const result = createWebhookSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty events array', () => {
      const invalidData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: []
      }
      
      const result = createWebhookSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid event types in array', () => {
      const invalidData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['customer.created', 'invalid.event']
      }
      
      const result = createWebhookSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing required fields', () => {
      const invalidData = {
        name: 'Test Webhook'
        // Missing url and events
      }
      
      const result = createWebhookSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('updateWebhookSchema', () => {
    it('should validate partial update with name only', () => {
      const validData = {
        name: 'Updated Webhook Name'
      }
      
      const result = updateWebhookSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Updated Webhook Name')
      }
    })

    it('should validate partial update with URL only', () => {
      const validData = {
        url: 'https://new-endpoint.com/webhook'
      }
      
      const result = updateWebhookSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.url).toBe('https://new-endpoint.com/webhook')
      }
    })

    it('should validate complete update', () => {
      const validData = {
        name: 'Updated Complete Webhook',
        url: 'https://updated.example.com/webhook',
        events: ['invoice.created', 'invoice.paid'],
        secret: 'new-secret',
        headers: {
          'X-Updated-Header': 'updated-value'
        },
        is_active: false
      }
      
      const result = updateWebhookSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Updated Complete Webhook')
        expect(result.data.url).toBe('https://updated.example.com/webhook')
        expect(result.data.events).toEqual(['invoice.created', 'invoice.paid'])
        expect(result.data.secret).toBe('new-secret')
        expect(result.data.headers).toEqual({ 'X-Updated-Header': 'updated-value' })
        expect(result.data.is_active).toBe(false)
      }
    })

    it('should validate empty update object', () => {
      const validData = {}
      
      const result = updateWebhookSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty name when provided', () => {
      const invalidData = {
        name: ''
      }
      
      const result = updateWebhookSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid URL when provided', () => {
      const invalidData = {
        url: 'not-a-valid-url'
      }
      
      const result = updateWebhookSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid event types when provided', () => {
      const invalidData = {
        events: ['customer.created', 'invalid.event']
      }
      
      const result = updateWebhookSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate is_active boolean', () => {
      const validData = {
        is_active: true
      }
      
      const result = updateWebhookSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_active).toBe(true)
      }
    })
  })
})