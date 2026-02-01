import { z } from 'zod'

// Estimate status
export const estimateStatusSchema = z.enum([
  'draft',
  'pending_review',
  'approved',
  'sent',
  'accepted',
  'rejected',
  'expired',
])

// Line item type
export const lineItemTypeSchema = z.enum([
  'labor',
  'material',
  'equipment',
  'disposal',
  'travel',
  'other',
])

// Create estimate
export const createEstimateSchema = z.object({
  site_survey_id: z.string().uuid().optional(),
  customer_id: z.string().uuid('Invalid customer ID'),
  project_name: z.string().min(1, 'Project name is required').max(255),
  scope_of_work: z.string().max(5000).optional(),
  estimated_duration_days: z.number().int().positive().optional(),
  estimated_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimated_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  markup_percent: z.number().min(0).max(100).optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  tax_percent: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
  internal_notes: z.string().max(2000).optional(),
})

// Update estimate
export const updateEstimateSchema = z.object({
  project_name: z.string().min(1).max(255).optional(),
  scope_of_work: z.string().max(5000).optional(),
  estimated_duration_days: z.number().int().positive().optional(),
  estimated_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimated_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  markup_percent: z.number().min(0).max(100).optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  tax_percent: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
  internal_notes: z.string().max(2000).optional(),
  status: estimateStatusSchema.optional(),
})

// Add line item
export const addLineItemSchema = z.object({
  item_type: lineItemTypeSchema,
  category: z.string().max(100).optional(),
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().max(20).optional(),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  is_optional: z.boolean().optional().default(false),
  is_included: z.boolean().optional().default(true),
  sort_order: z.number().int().optional(),
})

// Update line item
export const updateLineItemSchema = z.object({
  item_type: lineItemTypeSchema.optional(),
  category: z.string().max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().max(20).optional(),
  unit_price: z.number().min(0).optional(),
  is_optional: z.boolean().optional(),
  is_included: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

// Approve estimate
export const approveEstimateSchema = z.object({
  notes: z.string().max(1000).optional(),
})

// Estimate list query
export const estimateListQuerySchema = z.object({
  status: z.string().optional(),
  customer_id: z.string().optional(),
  survey_id: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
}).passthrough()

// Create estimate from survey
export const createEstimateFromSurveySchema = z.object({
  site_survey_id: z.string().uuid('Invalid site survey ID'),
  customer_id: z.string().uuid().optional(),
  project_name: z.string().max(255).optional(),
  project_description: z.string().max(5000).optional(),
  scope_of_work: z.string().max(10000).optional(),
  estimated_duration_days: z.number().int().positive().optional(),
  estimated_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimated_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  markup_percent: z.number().min(0).max(100).optional(),
  internal_notes: z.string().max(5000).optional(),
})

// Bulk update line items
export const bulkUpdateLineItemsSchema = z.object({
  line_items: z.array(z.object({
    id: z.string().uuid(),
    item_type: lineItemTypeSchema.optional(),
    category: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
    quantity: z.number().positive().optional(),
    unit: z.string().max(20).optional(),
    unit_price: z.number().min(0).optional(),
    is_optional: z.boolean().optional(),
    is_included: z.boolean().optional(),
    notes: z.string().max(1000).optional(),
    sort_order: z.number().int().optional(),
  })),
})

// Export types
export type CreateEstimateInput = z.infer<typeof createEstimateSchema>
export type UpdateEstimateInput = z.infer<typeof updateEstimateSchema>
export type AddLineItemInput = z.infer<typeof addLineItemSchema>
export type EstimateStatus = z.infer<typeof estimateStatusSchema>
export type LineItemType = z.infer<typeof lineItemTypeSchema>
