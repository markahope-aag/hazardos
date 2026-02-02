import { describe, it, expect } from 'vitest'
import {
  formatZodError,
  v1CustomerStatusSchema,
  v1CustomerTypeSchema,
  v1CustomerListQuerySchema,
  v1CreateCustomerSchema,
  v1UpdateCustomerSchema,
  v1JobStatusSchema,
  v1JobListQuerySchema,
  v1CreateJobSchema,
  v1UpdateJobSchema,
  v1InvoiceStatusSchema,
  v1InvoiceLineItemSchema,
  v1InvoiceListQuerySchema,
  v1CreateInvoiceSchema,
  v1EstimateStatusSchema,
  v1EstimateLineItemSchema,
  v1EstimateListQuerySchema,
  v1CreateEstimateSchema,
  uuidParamSchema,
} from '@/lib/validations/v1-api'
import { z } from 'zod'

describe('formatZodError', () => {
  it('formats simple error', () => {
    const schema = z.object({ name: z.string() })
    const result = schema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const message = formatZodError(result.error)
      expect(message).toContain('name')
    }
  })

  it('formats multiple errors', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
    })
    const result = schema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const message = formatZodError(result.error)
      expect(message).toContain('name')
      expect(message).toContain('email')
    }
  })

  it('handles error with no issues', () => {
    const fakeError = { issues: undefined } as unknown as z.ZodError
    const message = formatZodError(fakeError)
    expect(message).toBe('Validation error')
  })
})

describe('v1CustomerStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = ['lead', 'prospect', 'active', 'inactive']
    for (const status of statuses) {
      const result = v1CustomerStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = v1CustomerStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('v1CustomerTypeSchema', () => {
  it('accepts valid types', () => {
    const types = ['residential', 'commercial', 'industrial', 'government']
    for (const type of types) {
      const result = v1CustomerTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid type', () => {
    const result = v1CustomerTypeSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('v1CustomerListQuerySchema', () => {
  it('accepts valid query', () => {
    const result = v1CustomerListQuerySchema.safeParse({
      status: 'active',
      search: 'John',
      limit: '10',
      offset: '0',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = v1CustomerListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('validates limit range', () => {
    const valid = v1CustomerListQuerySchema.safeParse({ limit: '50' })
    expect(valid.success).toBe(true)

    const tooHigh = v1CustomerListQuerySchema.safeParse({ limit: '150' })
    expect(tooHigh.success).toBe(false)
  })

  it('rejects non-numeric limit', () => {
    const result = v1CustomerListQuerySchema.safeParse({ limit: 'abc' })
    expect(result.success).toBe(false)
  })
})

describe('v1CreateCustomerSchema', () => {
  it('accepts customer with first_name', () => {
    const result = v1CreateCustomerSchema.safeParse({
      first_name: 'John',
    })
    expect(result.success).toBe(true)
  })

  it('accepts customer with last_name', () => {
    const result = v1CreateCustomerSchema.safeParse({
      last_name: 'Doe',
    })
    expect(result.success).toBe(true)
  })

  it('accepts customer with company_name', () => {
    const result = v1CreateCustomerSchema.safeParse({
      company_name: 'Acme Corp',
    })
    expect(result.success).toBe(true)
  })

  it('requires at least one name field', () => {
    const result = v1CreateCustomerSchema.safeParse({
      email: 'john@example.com',
    })
    expect(result.success).toBe(false)
  })

  it('validates email format', () => {
    const result = v1CreateCustomerSchema.safeParse({
      first_name: 'John',
      email: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all optional fields', () => {
    const result = v1CreateCustomerSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
      company_name: 'Acme',
      address_line1: '123 Main St',
      address_line2: 'Suite 100',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      notes: 'VIP customer',
      status: 'active',
      customer_type: 'commercial',
      lead_source: 'referral',
    })
    expect(result.success).toBe(true)
  })
})

describe('v1UpdateCustomerSchema', () => {
  it('accepts partial update', () => {
    const result = v1UpdateCustomerSchema.safeParse({
      first_name: 'Jane',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = v1UpdateCustomerSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('validates email when provided', () => {
    const result = v1UpdateCustomerSchema.safeParse({
      email: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('v1JobStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = ['pending', 'scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'closed', 'cancelled']
    for (const status of statuses) {
      const result = v1JobStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = v1JobStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('v1CreateJobSchema', () => {
  const validJob = {
    customer_id: '550e8400-e29b-41d4-a716-446655440000',
  }

  it('accepts valid job', () => {
    const result = v1CreateJobSchema.safeParse(validJob)
    expect(result.success).toBe(true)
  })

  it('requires customer_id', () => {
    const result = v1CreateJobSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('requires valid UUID for customer_id', () => {
    const result = v1CreateJobSchema.safeParse({
      customer_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('validates date format', () => {
    const result = v1CreateJobSchema.safeParse({
      ...validJob,
      scheduled_date: '01-15-2024',
    })
    expect(result.success).toBe(false)
  })

  it('accepts hazard_types array', () => {
    const result = v1CreateJobSchema.safeParse({
      ...validJob,
      hazard_types: ['asbestos', 'lead'],
    })
    expect(result.success).toBe(true)
  })

  it('limits hazard_types array to 10', () => {
    const result = v1CreateJobSchema.safeParse({
      ...validJob,
      hazard_types: Array(11).fill('asbestos'),
    })
    expect(result.success).toBe(false)
  })
})

describe('v1InvoiceStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'void']
    for (const status of statuses) {
      const result = v1InvoiceStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = v1InvoiceStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('v1InvoiceLineItemSchema', () => {
  it('accepts valid line item', () => {
    const result = v1InvoiceLineItemSchema.safeParse({
      description: 'Service',
      unit_price: 100,
    })
    expect(result.success).toBe(true)
  })

  it('requires description', () => {
    const result = v1InvoiceLineItemSchema.safeParse({
      unit_price: 100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    const result = v1InvoiceLineItemSchema.safeParse({
      description: '',
      unit_price: 100,
    })
    expect(result.success).toBe(false)
  })

  it('requires non-negative unit_price', () => {
    const result = v1InvoiceLineItemSchema.safeParse({
      description: 'Service',
      unit_price: -10,
    })
    expect(result.success).toBe(false)
  })

  it('defaults quantity to 1', () => {
    const result = v1InvoiceLineItemSchema.safeParse({
      description: 'Service',
      unit_price: 100,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantity).toBe(1)
    }
  })

  it('requires positive quantity', () => {
    const result = v1InvoiceLineItemSchema.safeParse({
      description: 'Service',
      unit_price: 100,
      quantity: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('v1CreateInvoiceSchema', () => {
  const validInvoice = {
    customer_id: '550e8400-e29b-41d4-a716-446655440000',
    line_items: [{ description: 'Service', unit_price: 100 }],
  }

  it('accepts valid invoice', () => {
    const result = v1CreateInvoiceSchema.safeParse(validInvoice)
    expect(result.success).toBe(true)
  })

  it('requires customer_id', () => {
    const result = v1CreateInvoiceSchema.safeParse({
      line_items: [{ description: 'Service', unit_price: 100 }],
    })
    expect(result.success).toBe(false)
  })

  it('requires at least one line item', () => {
    const result = v1CreateInvoiceSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      line_items: [],
    })
    expect(result.success).toBe(false)
  })

  it('limits line items to 100', () => {
    const result = v1CreateInvoiceSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      line_items: Array(101).fill({ description: 'Service', unit_price: 100 }),
    })
    expect(result.success).toBe(false)
  })

  it('validates due_date format', () => {
    const result = v1CreateInvoiceSchema.safeParse({
      ...validInvoice,
      due_date: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('v1EstimateStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']
    for (const status of statuses) {
      const result = v1EstimateStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = v1EstimateStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('v1EstimateLineItemSchema', () => {
  it('accepts valid line item', () => {
    const result = v1EstimateLineItemSchema.safeParse({
      description: 'Service',
      unit_price: 100,
    })
    expect(result.success).toBe(true)
  })

  it('accepts category', () => {
    const result = v1EstimateLineItemSchema.safeParse({
      description: 'Service',
      unit_price: 100,
      category: 'labor',
    })
    expect(result.success).toBe(true)
  })
})

describe('v1CreateEstimateSchema', () => {
  const validEstimate = {
    customer_id: '550e8400-e29b-41d4-a716-446655440000',
    line_items: [{ description: 'Service', unit_price: 100 }],
  }

  it('accepts valid estimate', () => {
    const result = v1CreateEstimateSchema.safeParse(validEstimate)
    expect(result.success).toBe(true)
  })

  it('requires customer_id', () => {
    const result = v1CreateEstimateSchema.safeParse({
      line_items: [{ description: 'Service', unit_price: 100 }],
    })
    expect(result.success).toBe(false)
  })

  it('requires at least one line item', () => {
    const result = v1CreateEstimateSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      line_items: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional site_survey_id', () => {
    const result = v1CreateEstimateSchema.safeParse({
      ...validEstimate,
      site_survey_id: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
  })

  it('validates valid_until date format', () => {
    const result = v1CreateEstimateSchema.safeParse({
      ...validEstimate,
      valid_until: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('uuidParamSchema', () => {
  it('accepts valid UUID', () => {
    const result = uuidParamSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID', () => {
    const result = uuidParamSchema.safeParse({
      id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('requires id', () => {
    const result = uuidParamSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
