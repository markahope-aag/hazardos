import { describe, it, expect } from 'vitest'
import {
  idParamSchema,
  paginationQuerySchema,
  searchQuerySchema,
  dateRangeQuerySchema,
  contactSchema,
  addressSchema,
  moneySchema,
  percentageSchema,
  dateStringSchema,
  timeStringSchema,
  uuidSchema,
  optionalEmailSchema,
  phoneSchema
} from '@/lib/validations/common'

describe('Common Validation Schemas', () => {
  describe('idParamSchema', () => {
    it('should accept valid UUID', () => {
      const result = idParamSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const result = idParamSchema.safeParse({ id: 'not-a-uuid' })
      expect(result.success).toBe(false)
    })

    it('should reject empty string', () => {
      const result = idParamSchema.safeParse({ id: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('paginationQuerySchema', () => {
    it('should accept valid pagination params', () => {
      const result = paginationQuerySchema.safeParse({
        limit: '10',
        offset: '0'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(10)
        expect(result.data.offset).toBe(0)
      }
    })

    it('should accept empty pagination', () => {
      const result = paginationQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should transform string numbers', () => {
      const result = paginationQuerySchema.safeParse({ limit: '25' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data.limit).toBe('number')
      }
    })
  })

  describe('searchQuerySchema', () => {
    it('should accept search with pagination', () => {
      const result = searchQuerySchema.safeParse({
        search: 'test',
        limit: '20',
        offset: '10'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe('test')
        expect(result.data.limit).toBe(20)
      }
    })

    it('should accept empty search', () => {
      const result = searchQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('dateRangeQuerySchema', () => {
    it('should accept valid date range', () => {
      const result = dateRangeQuerySchema.safeParse({
        from_date: '2026-01-01',
        to_date: '2026-12-31'
      })
      expect(result.success).toBe(true)
    })

    it('should accept partial date range', () => {
      const result = dateRangeQuerySchema.safeParse({
        from_date: '2026-01-01'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid date format', () => {
      const result = dateRangeQuerySchema.safeParse({
        from_date: '01-01-2026'
      })
      expect(result.success).toBe(false)
    })

    it('should accept dates matching YYYY-MM-DD pattern', () => {
      // Note: Schema only validates format pattern, not actual date values
      const result = dateRangeQuerySchema.safeParse({
        from_date: '2026-13-01' // Pattern valid even if not a real date
      })
      expect(result.success).toBe(true)
    })
  })

  describe('contactSchema', () => {
    it('should accept valid contact', () => {
      const result = contactSchema.safeParse({
        name: 'John Doe',
        title: 'Manager',
        email: 'john@example.com',
        phone: '555-123-4567',
        is_primary: true
      })
      expect(result.success).toBe(true)
    })

    it('should require name', () => {
      const result = contactSchema.safeParse({
        email: 'john@example.com'
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty name', () => {
      const result = contactSchema.safeParse({ name: '' })
      expect(result.success).toBe(false)
    })

    it('should accept empty email', () => {
      const result = contactSchema.safeParse({
        name: 'John',
        email: ''
      })
      expect(result.success).toBe(true)
    })

    it('should default is_primary to false', () => {
      const result = contactSchema.safeParse({ name: 'John' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_primary).toBe(false)
      }
    })

    it('should accept preferred_contact_method enum', () => {
      const methods = ['email', 'phone', 'mobile']
      methods.forEach(method => {
        const result = contactSchema.safeParse({
          name: 'John',
          preferred_contact_method: method
        })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('addressSchema', () => {
    it('should accept valid address', () => {
      const result = addressSchema.safeParse({
        address_line1: '123 Main St',
        address_line2: 'Suite 100',
        city: 'Springfield',
        state: 'IL',
        zip: '62701'
      })
      expect(result.success).toBe(true)
    })

    it('should accept empty address', () => {
      const result = addressSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should reject too long address_line1', () => {
      const result = addressSchema.safeParse({
        address_line1: 'x'.repeat(256)
      })
      expect(result.success).toBe(false)
    })

    it('should reject too long zip', () => {
      const result = addressSchema.safeParse({
        zip: '12345-67890'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('moneySchema', () => {
    it('should accept positive integers', () => {
      expect(moneySchema.safeParse(1000).success).toBe(true)
    })

    it('should accept zero', () => {
      expect(moneySchema.safeParse(0).success).toBe(true)
    })

    it('should reject negative numbers', () => {
      expect(moneySchema.safeParse(-100).success).toBe(false)
    })

    it('should reject decimals', () => {
      expect(moneySchema.safeParse(10.5).success).toBe(false)
    })
  })

  describe('percentageSchema', () => {
    it('should accept valid percentages', () => {
      expect(percentageSchema.safeParse(0).success).toBe(true)
      expect(percentageSchema.safeParse(50).success).toBe(true)
      expect(percentageSchema.safeParse(100).success).toBe(true)
    })

    it('should accept decimals', () => {
      expect(percentageSchema.safeParse(12.5).success).toBe(true)
    })

    it('should reject negative percentages', () => {
      expect(percentageSchema.safeParse(-10).success).toBe(false)
    })

    it('should reject percentages over 100', () => {
      expect(percentageSchema.safeParse(101).success).toBe(false)
    })
  })

  describe('dateStringSchema', () => {
    it('should accept valid date format', () => {
      expect(dateStringSchema.safeParse('2026-01-15').success).toBe(true)
    })

    it('should reject invalid format', () => {
      expect(dateStringSchema.safeParse('01-15-2026').success).toBe(false)
      expect(dateStringSchema.safeParse('2026/01/15').success).toBe(false)
      expect(dateStringSchema.safeParse('2026-1-15').success).toBe(false)
    })
  })

  describe('timeStringSchema', () => {
    it('should accept valid time format', () => {
      expect(timeStringSchema.safeParse('10:30').success).toBe(true)
      expect(timeStringSchema.safeParse('00:00').success).toBe(true)
      expect(timeStringSchema.safeParse('23:59').success).toBe(true)
    })

    it('should reject invalid format', () => {
      expect(timeStringSchema.safeParse('10:30:00').success).toBe(false)
      expect(timeStringSchema.safeParse('10:3').success).toBe(false)
      expect(timeStringSchema.safeParse('1:30').success).toBe(false)
    })
  })

  describe('uuidSchema', () => {
    it('should accept valid UUID', () => {
      expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      expect(uuidSchema.safeParse('invalid-uuid').success).toBe(false)
      expect(uuidSchema.safeParse('').success).toBe(false)
    })
  })

  describe('optionalEmailSchema', () => {
    it('should accept valid email', () => {
      expect(optionalEmailSchema.safeParse('test@example.com').success).toBe(true)
    })

    it('should accept empty string', () => {
      expect(optionalEmailSchema.safeParse('').success).toBe(true)
    })

    it('should accept undefined', () => {
      expect(optionalEmailSchema.safeParse(undefined).success).toBe(true)
    })

    it('should reject invalid email', () => {
      expect(optionalEmailSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('phoneSchema', () => {
    it('should accept valid phone', () => {
      expect(phoneSchema.safeParse('555-123-4567').success).toBe(true)
    })

    it('should accept undefined', () => {
      expect(phoneSchema.safeParse(undefined).success).toBe(true)
    })

    it('should reject too long phone', () => {
      expect(phoneSchema.safeParse('123456789012345678901').success).toBe(false)
    })
  })
})
