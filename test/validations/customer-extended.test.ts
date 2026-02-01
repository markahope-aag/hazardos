import { describe, it, expect } from 'vitest'
import {
  customerSchema,
  defaultCustomerValues,
  US_STATES,
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_SOURCE_OPTIONS
} from '@/lib/validations/customer'

describe('Customer Validation Schema', () => {
  const validCustomerData = {
    name: 'John Doe',
    company_name: 'Acme Corp',
    email: 'john@example.com',
    phone: '555-123-4567',
    address_line1: '123 Main St',
    address_line2: 'Suite 100',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    status: 'lead' as const,
    source: 'phone' as const,
    marketing_consent: false,
    notes: 'Test customer notes'
  }

  describe('Required Fields', () => {
    it('should validate name is required', () => {
      const { name, ...data } = validCustomerData
      const result = customerSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('name'))).toBe(true)
      }
    })

    it('should validate name cannot be empty', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        name: ''
      })
      expect(result.success).toBe(false)
    })

    it('should validate status is required', () => {
      const { status, ...data } = validCustomerData
      const result = customerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate marketing_consent is required', () => {
      const { marketing_consent, ...data } = validCustomerData
      const result = customerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Field Length Validation', () => {
    it('should accept name up to 255 characters', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        name: 'x'.repeat(255)
      })
      expect(result.success).toBe(true)
    })

    it('should reject name exceeding 255 characters', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        name: 'x'.repeat(256)
      })
      expect(result.success).toBe(false)
    })

    it('should accept company_name up to 255 characters', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        company_name: 'x'.repeat(255)
      })
      expect(result.success).toBe(true)
    })

    it('should reject company_name exceeding 255 characters', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        company_name: 'x'.repeat(256)
      })
      expect(result.success).toBe(false)
    })

    it('should accept phone up to 20 characters', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        phone: '12345678901234567890'
      })
      expect(result.success).toBe(true)
    })

    it('should reject phone exceeding 20 characters', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        phone: '123456789012345678901'
      })
      expect(result.success).toBe(false)
    })

    it('should accept zip up to 10 characters', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        zip: '12345-6789'
      })
      expect(result.success).toBe(true)
    })

    it('should reject zip exceeding 10 characters', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        zip: '12345-67890'
      })
      expect(result.success).toBe(false)
    })

    it('should accept notes up to 2000 characters', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        notes: 'x'.repeat(2000)
      })
      expect(result.success).toBe(true)
    })

    it('should reject notes exceeding 2000 characters', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        notes: 'x'.repeat(2001)
      })
      expect(result.success).toBe(false)
    })
  })

  describe('Email Validation', () => {
    it('should accept valid email', () => {
      const result = customerSchema.safeParse(validCustomerData)
      expect(result.success).toBe(true)
    })

    it('should accept empty email', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        email: ''
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        email: 'invalid-email'
      })
      expect(result.success).toBe(false)
    })

    it('should accept undefined email', () => {
      const { email, ...data } = validCustomerData
      const result = customerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept email with subdomain', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        email: 'user@mail.example.com'
      })
      expect(result.success).toBe(true)
    })
  })

  describe('Status Validation', () => {
    const validStatuses = ['lead', 'prospect', 'customer', 'inactive']

    validStatuses.forEach(status => {
      it(`should accept status: ${status}`, () => {
        const result = customerSchema.safeParse({
          ...validCustomerData,
          status
        })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid status', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        status: 'invalid'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('Source Validation', () => {
    const validSources = ['phone', 'website', 'mail', 'referral', 'other']

    validSources.forEach(source => {
      it(`should accept source: ${source}`, () => {
        const result = customerSchema.safeParse({
          ...validCustomerData,
          source
        })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid source', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        source: 'invalid'
      })
      expect(result.success).toBe(false)
    })

    it('should accept undefined source', () => {
      const { source, ...data } = validCustomerData
      const result = customerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Optional Fields', () => {
    it('should accept empty company_name', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        company_name: ''
      })
      expect(result.success).toBe(true)
    })

    it('should accept undefined company_name', () => {
      const { company_name, ...data } = validCustomerData
      const result = customerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept empty phone', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        phone: ''
      })
      expect(result.success).toBe(true)
    })

    it('should accept empty address fields', () => {
      const result = customerSchema.safeParse({
        ...validCustomerData,
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip: ''
      })
      expect(result.success).toBe(true)
    })
  })

  describe('Default Values', () => {
    it('should have lead as default status', () => {
      expect(defaultCustomerValues.status).toBe('lead')
    })

    it('should have false as default marketing_consent', () => {
      expect(defaultCustomerValues.marketing_consent).toBe(false)
    })
  })

  describe('US States Data', () => {
    it('should have 50 states', () => {
      expect(US_STATES.length).toBe(50)
    })

    it('should have state with value and label', () => {
      const firstState = US_STATES[0]
      expect(firstState).toHaveProperty('value')
      expect(firstState).toHaveProperty('label')
    })

    it('should have 2-letter state codes', () => {
      US_STATES.forEach(state => {
        expect(state.value.length).toBe(2)
        expect(state.value).toBe(state.value.toUpperCase())
      })
    })

    it('should include common states', () => {
      const stateValues = US_STATES.map(s => s.value)
      expect(stateValues).toContain('CA')
      expect(stateValues).toContain('NY')
      expect(stateValues).toContain('TX')
      expect(stateValues).toContain('FL')
      expect(stateValues).toContain('IL')
    })
  })

  describe('Customer Status Options', () => {
    it('should have 4 status options', () => {
      expect(CUSTOMER_STATUS_OPTIONS.length).toBe(4)
    })

    it('should have lead status option', () => {
      const lead = CUSTOMER_STATUS_OPTIONS.find(o => o.value === 'lead')
      expect(lead).toBeDefined()
      expect(lead?.label).toBe('Lead')
    })

    it('should have prospect status option', () => {
      const prospect = CUSTOMER_STATUS_OPTIONS.find(o => o.value === 'prospect')
      expect(prospect).toBeDefined()
      expect(prospect?.label).toBe('Prospect')
    })

    it('should have customer status option', () => {
      const customer = CUSTOMER_STATUS_OPTIONS.find(o => o.value === 'customer')
      expect(customer).toBeDefined()
      expect(customer?.label).toBe('Customer')
    })

    it('should have inactive status option', () => {
      const inactive = CUSTOMER_STATUS_OPTIONS.find(o => o.value === 'inactive')
      expect(inactive).toBeDefined()
      expect(inactive?.label).toBe('Inactive')
    })

    it('should have descriptions for all options', () => {
      CUSTOMER_STATUS_OPTIONS.forEach(option => {
        expect(option.description).toBeDefined()
        expect(option.description.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Customer Source Options', () => {
    it('should have 5 source options', () => {
      expect(CUSTOMER_SOURCE_OPTIONS.length).toBe(5)
    })

    it('should have all expected sources', () => {
      const sources = CUSTOMER_SOURCE_OPTIONS.map(o => o.value)
      expect(sources).toContain('phone')
      expect(sources).toContain('website')
      expect(sources).toContain('mail')
      expect(sources).toContain('referral')
      expect(sources).toContain('other')
    })

    it('should have labels for all options', () => {
      CUSTOMER_SOURCE_OPTIONS.forEach(option => {
        expect(option.label).toBeDefined()
        expect(option.label.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Complete Valid Customer', () => {
    it('should accept complete valid customer data', () => {
      const result = customerSchema.safeParse(validCustomerData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John Doe')
        expect(result.data.email).toBe('john@example.com')
        expect(result.data.status).toBe('lead')
      }
    })

    it('should accept minimal valid customer data', () => {
      const minimalData = {
        name: 'Jane',
        status: 'prospect',
        marketing_consent: true
      }
      const result = customerSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })
  })
})
