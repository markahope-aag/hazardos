import { z } from 'zod'

// Segment type
export const segmentTypeSchema = z.enum(['dynamic', 'static'])

// Segment rule operator (matches SegmentRule from types/integrations.ts)
export const segmentRuleOperatorSchema = z.enum([
  '=',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'is_null',
  'is_not_null',
])

// Segment rule
export const segmentRuleSchema = z.object({
  field: z.string(),
  operator: segmentRuleOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
})

// Create segment
export const createSegmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  segment_type: segmentTypeSchema.optional().default('dynamic'),
  rules: z.array(segmentRuleSchema).optional(),
  customer_ids: z.array(z.string().uuid()).optional(),
})

// Update segment
export const updateSegmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  rules: z.array(segmentRuleSchema).optional(),
  is_active: z.boolean().optional(),
})

// Export types
export type CreateSegmentInput = z.infer<typeof createSegmentSchema>
export type UpdateSegmentInput = z.infer<typeof updateSegmentSchema>
export type SegmentType = z.infer<typeof segmentTypeSchema>
