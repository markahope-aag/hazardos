import { z } from 'zod'

// Invoice status
export const invoiceStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'paid',
  'partial',
  'overdue',
  'void',
])

// Payment method
export const paymentMethodSchema = z.enum([
  'cash',
  'check',
  'credit_card',
  'bank_transfer',
  'other',
])

// Create invoice
export const createInvoiceSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  job_id: z.string().uuid().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  notes: z.string().max(2000).optional(),
  payment_terms: z.string().max(500).optional(),
  tax_percent: z.number().min(0).max(100).optional(),
})

// Update invoice
export const updateInvoiceSchema = z.object({
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
  payment_terms: z.string().max(500).optional(),
  tax_percent: z.number().min(0).max(100).optional(),
  status: invoiceStatusSchema.optional(),
})

// Add invoice line item
export const addInvoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().positive('Quantity must be positive'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  sort_order: z.number().int().optional(),
})

// Update invoice line item
export const updateInvoiceLineItemSchema = z.object({
  line_item_id: z.string().uuid('Invalid line item ID'),
  description: z.string().min(1).max(500).optional(),
  quantity: z.number().positive().optional(),
  unit_price: z.number().min(0).optional(),
  sort_order: z.number().int().optional(),
})

// Delete invoice line item
export const deleteInvoiceLineItemSchema = z.object({
  line_item_id: z.string().uuid('Invalid line item ID'),
})

// Add payment
export const addPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  payment_method: paymentMethodSchema,
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  reference_number: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

// Send invoice
export const sendInvoiceSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  message: z.string().max(2000).optional(),
})

// Create invoice from job
export const createInvoiceFromJobSchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  due_days: z.number().int().positive().optional().default(30),
  include_change_orders: z.boolean().optional().default(true),
})

// Invoice list query
export const invoiceListQuerySchema = z.object({
  status: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  overdue: z.string().transform(v => v === 'true').optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
})

// Export types
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>
export type AddPaymentInput = z.infer<typeof addPaymentSchema>
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>
export type PaymentMethod = z.infer<typeof paymentMethodSchema>
