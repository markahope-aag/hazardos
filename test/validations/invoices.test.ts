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
  invoiceListQuerySchema
} from '@/lib/validations/invoices'

describe('Invoice Validation Schemas', () => {
  describe('invoiceStatusSchema', () => {
    it('should accept all valid status values', () => {
      const validStatuses = ['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'void']
      validStatuses.forEach(status => {
        expect(invoiceStatusSchema.safeParse(status).success).toBe(true)
      })
    })

    it('should reject invalid status', () => {
      expect(invoiceStatusSchema.safeParse('invalid').success).toBe(false)
      expect(invoiceStatusSchema.safeParse('').success).toBe(false)
    })
  })

  describe('paymentMethodSchema', () => {
    it('should accept all valid payment methods', () => {
      const validMethods = ['cash', 'check', 'credit_card', 'ach', 'other']
      validMethods.forEach(method => {
        expect(paymentMethodSchema.safeParse(method).success).toBe(true)
      })
    })

    it('should reject invalid payment method', () => {
      expect(paymentMethodSchema.safeParse('paypal').success).toBe(false)
      expect(paymentMethodSchema.safeParse('bank_transfer').success).toBe(false)
      expect(paymentMethodSchema.safeParse('').success).toBe(false)
    })
  })

  describe('createInvoiceSchema', () => {
    const validInvoice = {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      due_date: '2026-02-15'
    }

    it('should accept valid minimal invoice', () => {
      const result = createInvoiceSchema.safeParse(validInvoice)
      expect(result.success).toBe(true)
    })

    it('should accept full invoice with all fields', () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        job_id: '550e8400-e29b-41d4-a716-446655440001',
        notes: 'Payment due within 30 days',
        payment_terms: 'Net 30',
        tax_percent: 8.5
      })
      expect(result.success).toBe(true)
    })

    it('should require customer_id', () => {
      const result = createInvoiceSchema.safeParse({
        due_date: '2026-02-15'
      })
      expect(result.success).toBe(false)
    })

    it('should require due_date', () => {
      const result = createInvoiceSchema.safeParse({
        customer_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid due_date format', () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        due_date: '02-15-2026'
      })
      expect(result.success).toBe(false)
    })

    it('should reject notes exceeding 2000 characters', () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        notes: 'x'.repeat(2001)
      })
      expect(result.success).toBe(false)
    })

    it('should reject tax_percent over 100', () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        tax_percent: 101
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateInvoiceSchema', () => {
    it('should accept empty update', () => {
      const result = updateInvoiceSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept status update', () => {
      const result = updateInvoiceSchema.safeParse({
        status: 'sent'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = updateInvoiceSchema.safeParse({
        status: 'invalid'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('addInvoiceLineItemSchema', () => {
    const validLineItem = {
      description: 'Asbestos removal - labor',
      quantity: 8,
      unit_price: 75
    }

    it('should accept valid line item', () => {
      const result = addInvoiceLineItemSchema.safeParse(validLineItem)
      expect(result.success).toBe(true)
    })

    it('should require description', () => {
      const { description: _description, ...withoutDesc } = validLineItem
      const result = addInvoiceLineItemSchema.safeParse(withoutDesc)
      expect(result.success).toBe(false)
    })

    it('should reject empty description', () => {
      const result = addInvoiceLineItemSchema.safeParse({
        ...validLineItem,
        description: ''
      })
      expect(result.success).toBe(false)
    })

    it('should reject zero quantity', () => {
      const result = addInvoiceLineItemSchema.safeParse({
        ...validLineItem,
        quantity: 0
      })
      expect(result.success).toBe(false)
    })

    it('should accept zero unit_price', () => {
      const result = addInvoiceLineItemSchema.safeParse({
        ...validLineItem,
        unit_price: 0
      })
      expect(result.success).toBe(true)
    })

    it('should reject negative unit_price', () => {
      const result = addInvoiceLineItemSchema.safeParse({
        ...validLineItem,
        unit_price: -50
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateInvoiceLineItemSchema', () => {
    const validUpdate = {
      line_item_id: '550e8400-e29b-41d4-a716-446655440000'
    }

    it('should accept valid update with line_item_id only', () => {
      const result = updateInvoiceLineItemSchema.safeParse(validUpdate)
      expect(result.success).toBe(true)
    })

    it('should require line_item_id', () => {
      const result = updateInvoiceLineItemSchema.safeParse({
        quantity: 10
      })
      expect(result.success).toBe(false)
    })

    it('should accept partial updates', () => {
      const result = updateInvoiceLineItemSchema.safeParse({
        ...validUpdate,
        quantity: 10,
        unit_price: 80
      })
      expect(result.success).toBe(true)
    })
  })

  describe('deleteInvoiceLineItemSchema', () => {
    it('should accept valid UUID', () => {
      const result = deleteInvoiceLineItemSchema.safeParse({
        line_item_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const result = deleteInvoiceLineItemSchema.safeParse({
        line_item_id: 'not-a-uuid'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('addPaymentSchema', () => {
    const validPayment = {
      amount: 500,
      payment_method: 'check',
      payment_date: '2026-02-01'
    }

    it('should accept valid payment', () => {
      const result = addPaymentSchema.safeParse(validPayment)
      expect(result.success).toBe(true)
    })

    it('should accept payment with all fields', () => {
      const result = addPaymentSchema.safeParse({
        ...validPayment,
        reference_number: 'CHK-12345',
        notes: 'Partial payment'
      })
      expect(result.success).toBe(true)
    })

    it('should require positive amount', () => {
      const result = addPaymentSchema.safeParse({
        ...validPayment,
        amount: 0
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative amount', () => {
      const result = addPaymentSchema.safeParse({
        ...validPayment,
        amount: -100
      })
      expect(result.success).toBe(false)
    })

    it('should require payment_method', () => {
      const { payment_method: _payment_method, ...withoutMethod } = validPayment
      const result = addPaymentSchema.safeParse(withoutMethod)
      expect(result.success).toBe(false)
    })

    it('should require payment_date', () => {
      const { payment_date: _payment_date, ...withoutDate } = validPayment
      const result = addPaymentSchema.safeParse(withoutDate)
      expect(result.success).toBe(false)
    })
  })

  describe('sendInvoiceSchema', () => {
    it('should accept empty send options', () => {
      const result = sendInvoiceSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept email', () => {
      const result = sendInvoiceSchema.safeParse({
        email: 'customer@example.com'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = sendInvoiceSchema.safeParse({
        email: 'not-an-email'
      })
      expect(result.success).toBe(false)
    })

    it('should accept message', () => {
      const result = sendInvoiceSchema.safeParse({
        message: 'Please find your invoice attached.'
      })
      expect(result.success).toBe(true)
    })
  })

  describe('createInvoiceFromJobSchema', () => {
    it('should accept valid job_id', () => {
      const result = createInvoiceFromJobSchema.safeParse({
        job_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should require job_id', () => {
      const result = createInvoiceFromJobSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should accept custom due_days', () => {
      const result = createInvoiceFromJobSchema.safeParse({
        job_id: '550e8400-e29b-41d4-a716-446655440000',
        due_days: 45
      })
      expect(result.success).toBe(true)
    })

    it('should default due_days to 30', () => {
      const result = createInvoiceFromJobSchema.safeParse({
        job_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.due_days).toBe(30)
      }
    })

    it('should default include_change_orders to true', () => {
      const result = createInvoiceFromJobSchema.safeParse({
        job_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.include_change_orders).toBe(true)
      }
    })
  })

  describe('invoiceListQuerySchema', () => {
    it('should accept empty query', () => {
      const result = invoiceListQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept status filter', () => {
      const result = invoiceListQuerySchema.safeParse({
        status: 'paid'
      })
      expect(result.success).toBe(true)
    })

    it('should accept customer_id filter', () => {
      const result = invoiceListQuerySchema.safeParse({
        customer_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should accept job_id filter', () => {
      const result = invoiceListQuerySchema.safeParse({
        job_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should transform overdue string to boolean', () => {
      const result = invoiceListQuerySchema.safeParse({
        overdue: 'true'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.overdue).toBe(true)
      }
    })

    it('should transform pagination strings', () => {
      const result = invoiceListQuerySchema.safeParse({
        limit: '20',
        offset: '10'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(20)
        expect(result.data.offset).toBe(10)
      }
    })
  })
})
