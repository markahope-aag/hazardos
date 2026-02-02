import { describe, it, expect } from 'vitest'
import {
  customerStatusSchema,
  customerSourceSchema,
  contactRoleSchema,
  communicationPreferencesSchema,
  createCustomerSchema,
  updateCustomerSchema,
  customerListQuerySchema,
  createContactSchema,
  updateContactSchema,
} from '@/lib/validations/customers'

describe('customerStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = ['lead', 'prospect', 'customer', 'inactive']
    for (const status of statuses) {
      const result = customerStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = customerStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('customerSourceSchema', () => {
  it('accepts valid sources', () => {
    const sources = ['phone', 'website', 'mail', 'referral', 'other']
    for (const source of sources) {
      const result = customerSourceSchema.safeParse(source)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid source', () => {
    const result = customerSourceSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('contactRoleSchema', () => {
  it('accepts valid roles', () => {
    const roles = ['primary', 'billing', 'site', 'scheduling', 'general']
    for (const role of roles) {
      const result = contactRoleSchema.safeParse(role)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid role', () => {
    const result = contactRoleSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('communicationPreferencesSchema', () => {
  it('accepts valid preferences', () => {
    const result = communicationPreferencesSchema.safeParse({
      email: true,
      sms: false,
      mail: true,
    })
    expect(result.success).toBe(true)
  })

  it('has default values', () => {
    const result = communicationPreferencesSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe(true)
      expect(result.data.sms).toBe(false)
      expect(result.data.mail).toBe(false)
    }
  })
})

describe('createCustomerSchema', () => {
  it('accepts valid customer', () => {
    const result = createCustomerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = createCustomerSchema.safeParse({
      email: 'john@example.com',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createCustomerSchema.safeParse({
      name: '',
    })
    expect(result.success).toBe(false)
  })

  it('defaults status to lead', () => {
    const result = createCustomerSchema.safeParse({
      name: 'John Doe',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('lead')
    }
  })

  it('accepts all optional fields', () => {
    const result = createCustomerSchema.safeParse({
      name: 'John Doe',
      company_name: 'Acme Corp',
      email: 'john@example.com',
      phone: '555-1234',
      address_line1: '123 Main St',
      address_line2: 'Suite 100',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      status: 'customer',
      source: 'referral',
      communication_preferences: { email: true },
      marketing_consent: true,
      marketing_consent_date: '2024-01-01T00:00:00Z',
      notes: 'Test notes',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = createCustomerSchema.safeParse({
      name: 'John Doe',
      email: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding max length', () => {
    const result = createCustomerSchema.safeParse({
      name: 'a'.repeat(256),
    })
    expect(result.success).toBe(false)
  })
})

describe('updateCustomerSchema', () => {
  it('accepts partial update', () => {
    const result = updateCustomerSchema.safeParse({
      name: 'Jane Doe',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateCustomerSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('validates fields when provided', () => {
    const result = updateCustomerSchema.safeParse({
      email: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all fields', () => {
    const result = updateCustomerSchema.safeParse({
      name: 'Jane Doe',
      company_name: 'New Corp',
      status: 'customer',
    })
    expect(result.success).toBe(true)
  })
})

describe('customerListQuerySchema', () => {
  it('accepts valid query', () => {
    const result = customerListQuerySchema.safeParse({
      status: 'lead',
      search: 'John',
      limit: '10',
      offset: '0',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = customerListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('transforms string numbers', () => {
    const result = customerListQuerySchema.safeParse({
      limit: '25',
      offset: '10',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(25)
      expect(result.data.offset).toBe(10)
    }
  })

  it('allows passthrough of additional fields', () => {
    const result = customerListQuerySchema.safeParse({
      custom_field: 'value',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.custom_field).toBe('value')
    }
  })
})

describe('createContactSchema', () => {
  it('accepts valid contact', () => {
    const result = createContactSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = createContactSchema.safeParse({
      email: 'john@example.com',
    })
    expect(result.success).toBe(false)
  })

  it('defaults is_primary to false', () => {
    const result = createContactSchema.safeParse({
      name: 'John Doe',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_primary).toBe(false)
    }
  })

  it('accepts valid preferred_contact_method', () => {
    const methods = ['email', 'phone', 'mobile'] as const
    for (const method of methods) {
      const result = createContactSchema.safeParse({
        name: 'John',
        preferred_contact_method: method,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid preferred_contact_method', () => {
    const result = createContactSchema.safeParse({
      name: 'John',
      preferred_contact_method: 'fax',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all optional fields', () => {
    const result = createContactSchema.safeParse({
      name: 'John Doe',
      title: 'Manager',
      email: 'john@example.com',
      phone: '555-1234',
      mobile: '555-5678',
      role: 'primary',
      is_primary: true,
      preferred_contact_method: 'email',
      notes: 'Primary contact',
    })
    expect(result.success).toBe(true)
  })
})

describe('updateContactSchema', () => {
  it('accepts partial update', () => {
    const result = updateContactSchema.safeParse({
      name: 'Jane Doe',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateContactSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('validates fields when provided', () => {
    const result = updateContactSchema.safeParse({
      email: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})
