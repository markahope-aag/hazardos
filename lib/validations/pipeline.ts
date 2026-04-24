import { z } from 'zod'

const HAZARD_TYPES = ['asbestos', 'mold', 'lead', 'vermiculite', 'other'] as const
const URGENCY_LEVELS = ['routine', 'urgent', 'emergency'] as const
const PROPERTY_TYPES = [
  'residential_single_family',
  'residential_multi_family',
  'commercial',
  'industrial',
  'government',
] as const
const REGULATORY_TRIGGERS = [
  'inspection_required',
  'sale_pending',
  'tenant_complaint',
  'voluntary',
] as const

// Create opportunity
export const createOpportunitySchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  name: z.string().min(1, 'Name is required').max(255),
  stage_id: z.string().uuid('Invalid stage ID'),
  description: z.string().max(5000).optional(),
  estimated_value: z.number().min(0).optional(),
  expected_close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  owner_id: z.string().uuid().optional(),
  // Hazard + site scoping — previously stripped by the schema, so
  // opportunities created through the form saved with null values.
  hazard_types: z.array(z.enum(HAZARD_TYPES)).max(5).optional(),
  urgency: z.enum(URGENCY_LEVELS).optional(),
  property_type: z.enum(PROPERTY_TYPES).optional(),
  property_age: z.number().int().min(1700).max(new Date().getFullYear() + 1).optional(),
  regulatory_trigger: z.enum(REGULATORY_TRIGGERS).optional(),
  estimated_affected_area_sqft: z.number().min(0).optional(),
  // Site address on the opportunity itself (overrides customer's
  // default when the job is somewhere other than the billing address).
  service_address_line1: z.string().max(255).optional(),
  service_city: z.string().max(120).optional(),
  service_state: z.string().max(40).optional(),
  service_zip: z.string().max(20).optional(),
})

// Update opportunity
export const updateOpportunitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  stage_id: z.string().uuid().optional(),
  description: z.string().max(5000).optional(),
  estimated_value: z.number().min(0).optional(),
  expected_close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  owner_id: z.string().uuid().optional(),
  loss_reason: z.string().max(200).optional(),
  loss_notes: z.string().max(2000).optional(),
  competitor: z.string().max(200).optional(),
  hazard_types: z.array(z.enum(HAZARD_TYPES)).max(5).optional(),
  urgency: z.enum(URGENCY_LEVELS).optional(),
  property_type: z.enum(PROPERTY_TYPES).optional(),
  property_age: z.number().int().min(1700).max(new Date().getFullYear() + 1).optional(),
  regulatory_trigger: z.enum(REGULATORY_TRIGGERS).optional(),
  estimated_affected_area_sqft: z.number().min(0).optional(),
  service_address_line1: z.string().max(255).optional(),
  service_city: z.string().max(120).optional(),
  service_state: z.string().max(40).optional(),
  service_zip: z.string().max(20).optional(),
})

// Move opportunity to stage
export const moveOpportunitySchema = z.object({
  stage_id: z.string().uuid('Invalid stage ID'),
})

// Stage type
export const stageTypeSchema = z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])

// Pipeline stage
export const createStageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  stage_type: stageTypeSchema,
  color: z.string().max(20).optional(),
  probability: z.number().min(0).max(100).optional(),
})

export const updateStageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  stage_type: stageTypeSchema.optional(),
  color: z.string().max(20).optional(),
  probability: z.number().min(0).max(100).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})

// Pipeline list query
export const pipelineListQuerySchema = z.object({
  stage_id: z.string().uuid().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
}).passthrough()

// Export types
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>
