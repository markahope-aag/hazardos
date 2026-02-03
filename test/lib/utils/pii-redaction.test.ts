import { describe, it, expect } from 'vitest'
import { 
  redactPII, 
  redactPIIFromObject, 
  containsPII, 
  detectPIITypes 
} from '@/lib/utils/pii-redaction'

describe('pii-redaction', () => {
  describe('redactPII', () => {
    it('should redact phone numbers', () => {
      const text = 'Call me at (555) 123-4567 or 555-123-4567'
      const result = redactPII(text, { types: ['phone'] })
      
      expect(result.text).toBe('Call me at [REDACTED_PHONE] or [REDACTED_PHONE]')
      expect(result.wasRedacted).toBe(true)
      expect(result.redactionCounts.phone).toBe(2)
    })

    it('should redact email addresses', () => {
      const text = 'Contact john@example.com or support@company.org'
      const result = redactPII(text, { types: ['email'] })
      
      expect(result.text).toBe('Contact [REDACTED_EMAIL] or [REDACTED_EMAIL]')
      expect(result.wasRedacted).toBe(true)
      expect(result.redactionCounts.email).toBe(2)
    })

    it('should redact SSN', () => {
      const text = 'SSN: 123-45-6789'
      const result = redactPII(text, { types: ['ssn'] })
      
      expect(result.text).toBe('SSN: [REDACTED_SSN]')
      expect(result.wasRedacted).toBe(true)
      expect(result.redactionCounts.ssn).toBe(1)
    })

    it('should redact credit card numbers', () => {
      const text = 'Card: 1234 5678 9012 3456'
      const result = redactPII(text, { types: ['creditCard'] })
      
      expect(result.text).toBe('Card: [REDACTED_CREDITCARD]')
      expect(result.wasRedacted).toBe(true)
      expect(result.redactionCounts.creditCard).toBe(1)
    })

    it('should redact ZIP codes', () => {
      const text = 'ZIP: 12345 or 12345-6789'
      const result = redactPII(text, { types: ['zipCode'] })
      
      expect(result.text).toBe('ZIP: [REDACTED_ZIPCODE] or [REDACTED_ZIPCODE]')
      expect(result.wasRedacted).toBe(true)
      expect(result.redactionCounts.zipCode).toBe(2)
    })

    it('should use custom replacement text', () => {
      const text = 'Email: test@example.com'
      const result = redactPII(text, { 
        types: ['email'], 
        replacement: '[HIDDEN]',
        preserveType: false 
      })
      
      expect(result.text).toBe('Email: [HIDDEN]')
    })

    it('should preserve type when preserveType is true', () => {
      const text = 'Email: test@example.com'
      const result = redactPII(text, { 
        types: ['email'], 
        preserveType: true 
      })
      
      expect(result.text).toBe('Email: [REDACTED_EMAIL]')
    })

    it('should not redact when no PII found', () => {
      const text = 'This is just normal text'
      const result = redactPII(text)
      
      expect(result.text).toBe(text)
      expect(result.wasRedacted).toBe(false)
      expect(Object.keys(result.redactionCounts)).toHaveLength(0)
    })

    it('should redact multiple PII types', () => {
      const text = 'Contact John at john@example.com or (555) 123-4567'
      const result = redactPII(text, { types: ['email', 'phone'] })
      
      expect(result.text).toBe('Contact John at [REDACTED_EMAIL] or [REDACTED_PHONE]')
      expect(result.wasRedacted).toBe(true)
      expect(result.redactionCounts.email).toBe(1)
      expect(result.redactionCounts.phone).toBe(1)
    })
  })

  describe('redactPIIFromObject', () => {
    it('should redact PII from object string values', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        id: 'user-123'
      }
      
      const result = redactPIIFromObject(obj)
      
      expect(result.data.email).toBe('[REDACTED_EMAIL]')
      expect(result.data.phone).toBe('[REDACTED_PHONE]')
      expect(result.data.id).toBe('user-123') // Should preserve ID fields
      expect(result.wasRedacted).toBe(true)
      expect(result.totalRedactions).toBe(2)
    })

    it('should handle nested objects', () => {
      const obj = {
        user: {
          contact: {
            email: 'test@example.com'
          }
        }
      }
      
      const result = redactPIIFromObject(obj)
      
      expect(result.data.user.contact.email).toBe('[REDACTED_EMAIL]')
      expect(result.wasRedacted).toBe(true)
    })

    it('should handle arrays', () => {
      const obj = {
        emails: ['test1@example.com', 'test2@example.com']
      }
      
      const result = redactPIIFromObject(obj)
      
      expect(result.data.emails).toEqual(['[REDACTED_EMAIL]', '[REDACTED_EMAIL]'])
      expect(result.wasRedacted).toBe(true)
    })

    it('should preserve special fields', () => {
      const obj = {
        id: 'user-123',
        organization_id: 'org-456',
        user_id: 'user-789',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        email: 'test@example.com'
      }
      
      const result = redactPIIFromObject(obj)
      
      expect(result.data.id).toBe('user-123')
      expect(result.data.organization_id).toBe('org-456')
      expect(result.data.user_id).toBe('user-789')
      expect(result.data.created_at).toBe('2024-01-01')
      expect(result.data.updated_at).toBe('2024-01-02')
      expect(result.data.email).toBe('[REDACTED_EMAIL]')
    })
  })

  describe('containsPII', () => {
    it('should detect phone numbers', () => {
      const text = 'Call (555) 123-4567'
      expect(containsPII(text, ['phone'])).toBe(true)
    })

    it('should detect email addresses', () => {
      const text = 'Email test@example.com'
      expect(containsPII(text, ['email'])).toBe(true)
    })

    it('should return false when no PII found', () => {
      const text = 'Just normal text'
      expect(containsPII(text)).toBe(false)
    })

    it('should check all types by default', () => {
      const text = 'Email test@example.com'
      expect(containsPII(text)).toBe(true)
    })
  })

  describe('detectPIITypes', () => {
    it('should detect multiple PII types', () => {
      const text = 'Contact john@example.com or (555) 123-4567'
      const types = detectPIITypes(text)
      
      expect(types).toContain('email')
      expect(types).toContain('phone')
      expect(types).toHaveLength(2)
    })

    it('should return empty array when no PII found', () => {
      const text = 'Just normal text'
      const types = detectPIITypes(text)
      
      expect(types).toEqual([])
    })

    it('should detect SSN', () => {
      const text = 'SSN: 123-45-6789'
      const types = detectPIITypes(text)
      
      expect(types).toContain('ssn')
    })
  })
})