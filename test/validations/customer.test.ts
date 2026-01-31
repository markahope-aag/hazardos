import { describe, it, expect } from 'vitest'
import { customerSchema, defaultCustomerValues, US_STATES, CUSTOMER_STATUS_OPTIONS, CUSTOMER_SOURCE_OPTIONS } from '@/lib/validations/customer'

describe('Customer Validation Schema', () => {
  describe('customerSchema', () => {
    it('should validate a complete valid customer', () => {
      const validCustomer = {
        name: 'John Doe',
        company_name: 'Doe Industries',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        address_line1: '123 Main St',
        address_line2: 'Suite 100',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        status: 'prospect' as const,
        source: 'website' as const,
        notes: 'Interested in asbestos inspection',
        marketing_consent: true
      }

      const result = customerSchema.safeParse(validCustomer)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validCustomer)
      }
    })

    it('should validate minimal customer with required fields', () => {
      const minimalCustomer = {
        name: 'Jane Smith',
        status: 'lead' as const,
        marketing_consent: false
      }

      const result = customerSchema.safeParse(minimalCustomer)
      expect(result.success).toBe(true)
    })

    it('should reject customer without name', () => {
      const invalidCustomer = {
        email: 'test@example.com'
      }

      const result = customerSchema.safeParse(invalidCustomer)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('name'))).toBe(true)
      }
    })

    it('should reject invalid email format', () => {
      const invalidCustomer = {
        name: 'John Doe',
        email: 'invalid-email'
      }

      const result = customerSchema.safeParse(invalidCustomer)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('email'))).toBe(true)
      }
    })

    it('should accept empty string for optional email', () => {
      const customer = {
        name: 'John Doe',
        email: '',
        status: 'lead' as const,
        marketing_consent: false
      }

      const result = customerSchema.safeParse(customer)
      expect(result.success).toBe(true)
    })

    it('should validate valid customer status values', () => {
      const statuses = ['lead', 'prospect', 'customer', 'inactive'] as const

      statuses.forEach(status => {
        const customer = {
          name: 'Test Customer',
          status,
          marketing_consent: false
        }

        const result = customerSchema.safeParse(customer)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid customer status', () => {
      const customer = {
        name: 'Test Customer',
        status: 'invalid-status'
      }

      const result = customerSchema.safeParse(customer)
      expect(result.success).toBe(false)
    })

    it('should validate valid customer source values', () => {
      const sources = ['phone', 'website', 'mail', 'referral', 'other'] as const

      sources.forEach(source => {
        const customer = {
          name: 'Test Customer',
          status: 'lead' as const,
          marketing_consent: false,
          source
        }

        const result = customerSchema.safeParse(customer)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid customer source', () => {
      const customer = {
        name: 'Test Customer',
        source: 'invalid-source'
      }

      const result = customerSchema.safeParse(customer)
      expect(result.success).toBe(false)
    })

    it('should validate boolean marketing consent', () => {
      const customerTrue = {
        name: 'Test Customer',
        status: 'lead' as const,
        marketing_consent: true
      }

      const customerFalse = {
        name: 'Test Customer',
        status: 'lead' as const,
        marketing_consent: false
      }

      expect(customerSchema.safeParse(customerTrue).success).toBe(true)
      expect(customerSchema.safeParse(customerFalse).success).toBe(true)
    })

    it('should handle long notes field', () => {
      const customer = {
        name: 'Test Customer',
        status: 'lead' as const,
        marketing_consent: false,
        notes: 'A'.repeat(1000) // Very long notes
      }

      const result = customerSchema.safeParse(customer)
      expect(result.success).toBe(true)
    })

    it('should handle whitespace in string fields', () => {
      const customer = {
        name: '  John Doe  ',
        email: 'john@example.com', // Email validation doesn't allow spaces
        city: '  Anytown  ',
        status: 'lead' as const,
        marketing_consent: false
      }

      const result = customerSchema.safeParse(customer)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('  John Doe  ')
        expect(result.data.email).toBe('john@example.com')
        expect(result.data.city).toBe('  Anytown  ')
      }
    })
  })

  describe('defaultCustomerValues', () => {
    it('should have default values for required fields', () => {
      expect(defaultCustomerValues).toHaveProperty('status')
      expect(defaultCustomerValues).toHaveProperty('marketing_consent')
      expect(defaultCustomerValues.status).toBe('lead')
      expect(defaultCustomerValues.marketing_consent).toBe(false)
    })

    it('should have valid default status', () => {
      expect(['lead', 'prospect', 'customer', 'inactive']).toContain(defaultCustomerValues.status)
    })

    it('should validate against schema when combined with required fields', () => {
      const completeCustomer = {
        ...defaultCustomerValues,
        name: 'Test Customer'
      }
      const result = customerSchema.safeParse(completeCustomer)
      expect(result.success).toBe(true)
    })
  })

  describe('US_STATES', () => {
    it('should contain all 50 US states', () => {
      expect(US_STATES).toHaveLength(50)
    })

    it('should contain common states', () => {
      const commonStates = ['CA', 'NY', 'TX', 'FL', 'IL']
      commonStates.forEach(state => {
        expect(US_STATES.some(s => s.value === state)).toBe(true)
      })
    })

    it('should have proper structure for each state', () => {
      US_STATES.forEach(state => {
        expect(state).toHaveProperty('value')
        expect(state).toHaveProperty('label')
        expect(typeof state.value).toBe('string')
        expect(typeof state.label).toBe('string')
        expect(state.value.length).toBe(2)
      })
    })
  })

  describe('CUSTOMER_STATUS_OPTIONS', () => {
    it('should contain all valid status options', () => {
      const expectedStatuses = ['lead', 'prospect', 'customer', 'inactive']
      expect(CUSTOMER_STATUS_OPTIONS).toHaveLength(expectedStatuses.length)
      
      expectedStatuses.forEach(status => {
        expect(CUSTOMER_STATUS_OPTIONS.some(option => option.value === status)).toBe(true)
      })
    })

    it('should have proper structure for each option', () => {
      CUSTOMER_STATUS_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(typeof option.value).toBe('string')
        expect(typeof option.label).toBe('string')
      })
    })
  })

  describe('CUSTOMER_SOURCE_OPTIONS', () => {
    it('should contain all valid source options', () => {
      const expectedSources = ['phone', 'website', 'mail', 'referral', 'other']
      expect(CUSTOMER_SOURCE_OPTIONS).toHaveLength(expectedSources.length)
      
      expectedSources.forEach(source => {
        expect(CUSTOMER_SOURCE_OPTIONS.some(option => option.value === source)).toBe(true)
      })
    })

    it('should have proper structure for each option', () => {
      CUSTOMER_SOURCE_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(typeof option.value).toBe('string')
        expect(typeof option.label).toBe('string')
      })
    })
  })
})