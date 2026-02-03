import { describe, it, expect } from 'vitest'
import { 
  syncCustomerSchema, 
  syncHubSpotContactsSchema, 
  syncInvoiceSchema, 
  syncContactsSchema 
} from '@/lib/validations/integrations'

describe('integrations validations', () => {
  describe('syncCustomerSchema', () => {
    it('should validate valid customer ID', () => {
      const validData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      
      const result = syncCustomerSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.customer_id).toBe(validData.customer_id)
      }
    })

    it('should reject invalid UUID', () => {
      const invalidData = {
        customer_id: 'not-a-uuid'
      }
      
      const result = syncCustomerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid customer ID')
      }
    })

    it('should reject missing customer_id', () => {
      const invalidData = {}
      
      const result = syncCustomerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('syncHubSpotContactsSchema', () => {
    it('should validate with valid customer ID', () => {
      const validData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      
      const result = syncHubSpotContactsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.customer_id).toBe(validData.customer_id)
      }
    })

    it('should validate without customer ID (optional)', () => {
      const validData = {}
      
      const result = syncHubSpotContactsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.customer_id).toBeUndefined()
      }
    })

    it('should reject invalid UUID when provided', () => {
      const invalidData = {
        customer_id: 'not-a-uuid'
      }
      
      const result = syncHubSpotContactsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid customer ID')
      }
    })
  })

  describe('syncInvoiceSchema', () => {
    it('should validate valid invoice ID', () => {
      const validData = {
        invoice_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      
      const result = syncInvoiceSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.invoice_id).toBe(validData.invoice_id)
      }
    })

    it('should reject invalid UUID', () => {
      const invalidData = {
        invoice_id: 'not-a-uuid'
      }
      
      const result = syncInvoiceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid invoice ID')
      }
    })

    it('should reject missing invoice_id', () => {
      const invalidData = {}
      
      const result = syncInvoiceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('syncContactsSchema', () => {
    it('should validate with list_id', () => {
      const validData = {
        list_id: 'mailchimp-list-123'
      }
      
      const result = syncContactsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.list_id).toBe(validData.list_id)
      }
    })

    it('should validate with segment_id', () => {
      const validData = {
        segment_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      
      const result = syncContactsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.segment_id).toBe(validData.segment_id)
      }
    })

    it('should validate with both list_id and segment_id', () => {
      const validData = {
        list_id: 'mailchimp-list-123',
        segment_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      
      const result = syncContactsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.list_id).toBe(validData.list_id)
        expect(result.data.segment_id).toBe(validData.segment_id)
      }
    })

    it('should validate empty object (all fields optional)', () => {
      const validData = {}
      
      const result = syncContactsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid segment_id UUID', () => {
      const invalidData = {
        segment_id: 'not-a-uuid'
      }
      
      const result = syncContactsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})