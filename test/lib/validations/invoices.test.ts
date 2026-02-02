import { describe, it, expect } from 'vitest'
import {
  invoiceStatusSchema,
  paymentMethodSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  addInvoiceLineItemSchema,
  updateInvoiceLineItemSchema,
  deleteInvoiceLineItemSchema,
  addPaymentSchema,
  sendInvoiceSchema,
  createInvoiceFromJobSchema,
  invoiceListQuerySchema,
} from '@/lib/validations/invoices'

describe('invoiceStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = ['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'void']
    for (const status of statuses) {
      const result = invoiceStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = invoiceStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('paymentMethodSchema', () => {
  it('accepts valid payment methods', () => {
    const methods = ['check', 'credit_card', 'ach', 'cash', 'other']
    for (const method of methods) {
      const result = paymentMethodSchema.safeParse(method)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid payment method', () => {
    const result = paymentMethodSchema.safeParse('bitcoin')
    expect(result.success).toBe(false)
  })
})

describe('createInvoiceSchema', () => {
  const validInvoice = {
    customer_id: '550e8400-e29b-41d4-a716-446655440000',
    due_date: '2024-02-15',
  }

  it('accepts valid invoice', () => {
    const result = createInvoiceSchema.safeParse(validInvoice)
    expect(result.success).toBe(true)
  })

  it('requires customer_id', () => {
    const result = createInvoiceSchema.safeParse({
      due_date: '2024-02-15',
    })
    expect(result.success).toBe(false)
  })

  it('requires valid UUID for customer_id', () => {
    const result = createInvoiceSchema.safeParse({
      customer_id: 'not-a-uuid',
      due_date: '2024-02-15',
    })
    expect(result.success).toBe(false)
  })

  it('requires due_date', () => {
    const result = createInvoiceSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('validates date format', () => {
    const result = createInvoiceSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      due_date: '02-15-2024',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional job_id', () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      job_id: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
  })

  it('validates tax_percent range', () => {
    const validTax = createInvoiceSchema.safeParse({
      ...validInvoice,
      tax_percent: 8.5,
    })
    expect(validTax.success).toBe(true)

    const invalidTax = createInvoiceSchema.safeParse({
      ...validInvoice,
      tax_percent: 150,
    })
    expect(invalidTax.success).toBe(false)
  })
})

describe('updateInvoiceSchema', () => {
  it('accepts partial update', () => {
    const result = updateInvoiceSchema.safeParse({
      due_date: '2024-03-15',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateInvoiceSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts status update', () => {
    const result = updateInvoiceSchema.safeParse({
      status: 'sent',
    })
    expect(result.success).toBe(true)
  })

  it('validates date format when provided', () => {
    const result = updateInvoiceSchema.safeParse({
      due_date: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('addInvoiceLineItemSchema', () => {
  const validLineItem = {
    description: 'Test service',
    quantity: 1,
    unit_price: 100,
  }

  it('accepts valid line item', () => {
    const result = addInvoiceLineItemSchema.safeParse(validLineItem)
    expect(result.success).toBe(true)
  })

  it('requires description', () => {
    const result = addInvoiceLineItemSchema.safeParse({
      quantity: 1,
      unit_price: 100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    const result = addInvoiceLineItemSchema.safeParse({
      description: '',
      quantity: 1,
      unit_price: 100,
    })
    expect(result.success).toBe(false)
  })

  it('requires positive quantity', () => {
    const result = addInvoiceLineItemSchema.safeParse({
      description: 'Test',
      quantity: 0,
      unit_price: 100,
    })
    expect(result.success).toBe(false)
  })

  it('requires non-negative unit_price', () => {
    const result = addInvoiceLineItemSchema.safeParse({
      description: 'Test',
      quantity: 1,
      unit_price: -50,
    })
    expect(result.success).toBe(false)
  })

  it('accepts zero unit_price', () => {
    const result = addInvoiceLineItemSchema.safeParse({
      description: 'Free item',
      quantity: 1,
      unit_price: 0,
    })
    expect(result.success).toBe(true)
  })
})

describe('updateInvoiceLineItemSchema', () => {
  it('accepts valid update', () => {
    const result = updateInvoiceLineItemSchema.safeParse({
      line_item_id: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 2,
    })
    expect(result.success).toBe(true)
  })

  it('requires line_item_id', () => {
    const result = updateInvoiceLineItemSchema.safeParse({
      quantity: 2,
    })
    expect(result.success).toBe(false)
  })

  it('requires valid UUID', () => {
    const result = updateInvoiceLineItemSchema.safeParse({
      line_item_id: 'not-a-uuid',
      quantity: 2,
    })
    expect(result.success).toBe(false)
  })
})

describe('deleteInvoiceLineItemSchema', () => {
  it('accepts valid delete', () => {
    const result = deleteInvoiceLineItemSchema.safeParse({
      line_item_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('requires line_item_id', () => {
    const result = deleteInvoiceLineItemSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('addPaymentSchema', () => {
  const validPayment = {
    amount: 100,
    payment_method: 'credit_card' as const,
    payment_date: '2024-01-15',
  }

  it('accepts valid payment', () => {
    const result = addPaymentSchema.safeParse(validPayment)
    expect(result.success).toBe(true)
  })

  it('requires amount', () => {
    const result = addPaymentSchema.safeParse({
      payment_method: 'credit_card',
      payment_date: '2024-01-15',
    })
    expect(result.success).toBe(false)
  })

  it('requires positive amount', () => {
    const result = addPaymentSchema.safeParse({
      ...validPayment,
      amount: 0,
    })
    expect(result.success).toBe(false)
  })

  it('requires payment_method', () => {
    const result = addPaymentSchema.safeParse({
      amount: 100,
      payment_date: '2024-01-15',
    })
    expect(result.success).toBe(false)
  })

  it('requires payment_date', () => {
    const result = addPaymentSchema.safeParse({
      amount: 100,
      payment_method: 'credit_card',
    })
    expect(result.success).toBe(false)
  })

  it('validates date format', () => {
    const result = addPaymentSchema.safeParse({
      ...validPayment,
      payment_date: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('sendInvoiceSchema', () => {
  it('accepts valid send request', () => {
    const result = sendInvoiceSchema.safeParse({
      email: 'customer@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = sendInvoiceSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('validates email format', () => {
    const result = sendInvoiceSchema.safeParse({
      email: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts message', () => {
    const result = sendInvoiceSchema.safeParse({
      message: 'Please pay by due date',
    })
    expect(result.success).toBe(true)
  })
})

describe('createInvoiceFromJobSchema', () => {
  it('accepts valid input', () => {
    const result = createInvoiceFromJobSchema.safeParse({
      job_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('requires job_id', () => {
    const result = createInvoiceFromJobSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('requires valid UUID', () => {
    const result = createInvoiceFromJobSchema.safeParse({
      job_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('defaults due_days to 30', () => {
    const result = createInvoiceFromJobSchema.safeParse({
      job_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.due_days).toBe(30)
    }
  })

  it('defaults include_change_orders to true', () => {
    const result = createInvoiceFromJobSchema.safeParse({
      job_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.include_change_orders).toBe(true)
    }
  })

  it('requires positive due_days', () => {
    const result = createInvoiceFromJobSchema.safeParse({
      job_id: '550e8400-e29b-41d4-a716-446655440000',
      due_days: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('invoiceListQuerySchema', () => {
  it('accepts valid query', () => {
    const result = invoiceListQuerySchema.safeParse({
      status: 'sent',
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      limit: '10',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = invoiceListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('transforms overdue string to boolean', () => {
    const result = invoiceListQuerySchema.safeParse({
      overdue: 'true',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.overdue).toBe(true)
    }
  })

  it('transforms string numbers', () => {
    const result = invoiceListQuerySchema.safeParse({
      limit: '25',
      offset: '10',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(25)
      expect(result.data.offset).toBe(10)
    }
  })

  it('validates date format for from_date', () => {
    const result = invoiceListQuerySchema.safeParse({
      from_date: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})
