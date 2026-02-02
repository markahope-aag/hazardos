import { z } from 'zod'

// ========== Shared Utilities ==========

export function formatZodError(error: z.ZodError): string {
  return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
}

// Reusable pagination query schema
const paginationSchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0)).optional(),
})

// ========== Customer Schemas ==========

export const v1CustomerStatusSchema = z.enum([
  'lead',
  'prospect',
  'active',
  'inactive',
])

export const v1CustomerTypeSchema = z.enum([
  'residential',
  'commercial',
  'industrial',
  'government',
])

export const v1CustomerListQuerySchema = paginationSchema.extend({
  status: v1CustomerStatusSchema.optional(),
  search: z.string().max(100).optional(),
})

export const v1CreateCustomerSchema = z.object({
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  email: z.string().email('Invalid email format').max(255).optional(),
  phone: z.string().max(20).optional(),
  company_name: z.string().max(255).optional(),
  address_line1: z.string().max(255).optional(),
  address_line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  notes: z.string().max(5000).optional(),
  status: v1CustomerStatusSchema.optional(),
  customer_type: v1CustomerTypeSchema.optional(),
  lead_source: z.string().max(100).optional(),
}).refine(
  data => data.first_name || data.last_name || data.company_name,
  { message: 'At least first_name, last_name, or company_name is required' }
)

export const v1UpdateCustomerSchema = z.object({
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  email: z.string().email('Invalid email format').max(255).optional(),
  phone: z.string().max(20).optional(),
  company_name: z.string().max(255).optional(),
  address_line1: z.string().max(255).optional(),
  address_line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  notes: z.string().max(5000).optional(),
  status: v1CustomerStatusSchema.optional(),
  customer_type: v1CustomerTypeSchema.optional(),
})

// ========== Job Schemas ==========

export const v1JobStatusSchema = z.enum([
  'pending',
  'scheduled',
  'in_progress',
  'completed',
  'invoiced',
  'paid',
  'closed',
  'cancelled',
])

export const v1JobListQuerySchema = paginationSchema.extend({
  status: v1JobStatusSchema.optional(),
  customer_id: z.string().uuid('Invalid customer ID format').optional(),
})

export const v1CreateJobSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID format'),
  job_type: z.string().max(100).optional(),
  hazard_types: z.array(z.string().max(50)).max(10).optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  site_address_line1: z.string().max(255).optional(),
  site_city: z.string().max(100).optional(),
  site_state: z.string().max(50).optional(),
  site_zip: z.string().max(20).optional(),
})

export const v1UpdateJobSchema = z.object({
  job_type: z.string().max(100).optional(),
  hazard_types: z.array(z.string().max(50)).max(10).optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  site_address_line1: z.string().max(255).optional(),
  site_city: z.string().max(100).optional(),
  site_state: z.string().max(50).optional(),
  site_zip: z.string().max(20).optional(),
  status: v1JobStatusSchema.optional(),
})

// ========== Invoice Schemas ==========

export const v1InvoiceStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'partial',
  'paid',
  'overdue',
  'cancelled',
  'void',
])

export const v1InvoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().positive('Quantity must be positive').optional().default(1),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
})

export const v1InvoiceListQuerySchema = paginationSchema.extend({
  status: v1InvoiceStatusSchema.optional(),
  customer_id: z.string().uuid('Invalid customer ID format').optional(),
})

export const v1CreateInvoiceSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID format'),
  job_id: z.string().uuid('Invalid job ID format').optional(),
  line_items: z.array(v1InvoiceLineItemSchema).min(1, 'At least one line item is required').max(100),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  notes: z.string().max(2000).optional(),
})

// ========== Estimate Schemas ==========

export const v1EstimateStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
])

export const v1EstimateLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().positive('Quantity must be positive').optional().default(1),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  category: z.string().max(100).optional(),
})

export const v1EstimateListQuerySchema = paginationSchema.extend({
  status: v1EstimateStatusSchema.optional(),
  customer_id: z.string().uuid('Invalid customer ID format').optional(),
})

export const v1CreateEstimateSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID format'),
  site_survey_id: z.string().uuid('Invalid site survey ID format').optional(),
  line_items: z.array(v1EstimateLineItemSchema).min(1, 'At least one line item is required').max(100),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  notes: z.string().max(2000).optional(),
})

// ========== Common ID Validation ==========

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

// ========== Export Types ==========

export type V1CreateCustomerInput = z.infer<typeof v1CreateCustomerSchema>
export type V1UpdateCustomerInput = z.infer<typeof v1UpdateCustomerSchema>
export type V1CreateJobInput = z.infer<typeof v1CreateJobSchema>
export type V1UpdateJobInput = z.infer<typeof v1UpdateJobSchema>
export type V1CreateInvoiceInput = z.infer<typeof v1CreateInvoiceSchema>
export type V1CreateEstimateInput = z.infer<typeof v1CreateEstimateSchema>
