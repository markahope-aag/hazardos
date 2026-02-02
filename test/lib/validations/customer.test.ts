import { describe, it, expect } from 'vitest'
import {
  customerSchema,
  defaultCustomerValues,
  US_STATES,
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_SOURCE_OPTIONS,
} from '@/lib/validations/customer'

describe('customerSchema', () => {
  const validCustomer = {
    name: 'John Doe',
    status: 'lead' as const,
    marketing_consent: false,
  }

  it('accepts valid customer', () => {
    const result = customerSchema.safeParse(validCustomer)
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = customerSchema.safeParse({
      status: 'lead',
      marketing_consent: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = customerSchema.safeParse({
      name: '',
      status: 'lead',
      marketing_consent: false,
    })
    expect(result.success).toBe(false)
  })

  it('requires status', () => {
    const result = customerSchema.safeParse({
      name: 'John',
      marketing_consent: false,
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid status values', () => {
    const statuses = ['lead', 'prospect', 'customer', 'inactive'] as const
    for (const status of statuses) {
      const result = customerSchema.safeParse({
        ...validCustomer,
        status,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      status: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('requires marketing_consent', () => {
    const result = customerSchema.safeParse({
      name: 'John',
      status: 'lead',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid email', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      email: 'john@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty email string', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      email: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      email: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid source', () => {
    const sources = ['phone', 'website', 'mail', 'referral', 'other'] as const
    for (const source of sources) {
      const result = customerSchema.safeParse({
        ...validCustomer,
        source,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid source', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      source: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding max length', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      name: 'a'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('rejects notes exceeding max length', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      notes: 'a'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts full customer data', () => {
    const result = customerSchema.safeParse({
      name: 'John Doe',
      company_name: 'Acme Corp',
      email: 'john@acme.com',
      phone: '555-123-4567',
      address_line1: '123 Main St',
      address_line2: 'Suite 100',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      status: 'customer',
      source: 'referral',
      marketing_consent: true,
      notes: 'VIP customer',
    })
    expect(result.success).toBe(true)
  })
})

describe('defaultCustomerValues', () => {
  it('has default status of lead', () => {
    expect(defaultCustomerValues.status).toBe('lead')
  })

  it('has marketing_consent as false', () => {
    expect(defaultCustomerValues.marketing_consent).toBe(false)
  })
})

describe('US_STATES', () => {
  it('contains all 50 states', () => {
    expect(US_STATES.length).toBe(50)
  })

  it('has value and label for each state', () => {
    for (const state of US_STATES) {
      expect(state.value).toBeDefined()
      expect(state.label).toBeDefined()
      expect(state.value.length).toBe(2)
    }
  })

  it('includes common states', () => {
    const values = US_STATES.map(s => s.value)
    expect(values).toContain('CA')
    expect(values).toContain('NY')
    expect(values).toContain('TX')
    expect(values).toContain('FL')
  })
})

describe('CUSTOMER_STATUS_OPTIONS', () => {
  it('has all status options', () => {
    const values = CUSTOMER_STATUS_OPTIONS.map(o => o.value)
    expect(values).toContain('lead')
    expect(values).toContain('prospect')
    expect(values).toContain('customer')
    expect(values).toContain('inactive')
  })

  it('has label and description for each option', () => {
    for (const option of CUSTOMER_STATUS_OPTIONS) {
      expect(option.label).toBeDefined()
      expect(option.description).toBeDefined()
    }
  })
})

describe('CUSTOMER_SOURCE_OPTIONS', () => {
  it('has all source options', () => {
    const values = CUSTOMER_SOURCE_OPTIONS.map(o => o.value)
    expect(values).toContain('phone')
    expect(values).toContain('website')
    expect(values).toContain('mail')
    expect(values).toContain('referral')
    expect(values).toContain('other')
  })

  it('has label for each option', () => {
    for (const option of CUSTOMER_SOURCE_OPTIONS) {
      expect(option.label).toBeDefined()
    }
  })
})
