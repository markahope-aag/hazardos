import { describe, it, expect } from 'vitest'
import {
  estimateStatusSchema,
  lineItemTypeSchema,
  createEstimateSchema,
  updateEstimateSchema,
  addLineItemSchema,
  updateLineItemSchema,
  approveEstimateSchema,
  estimateListQuerySchema,
  createEstimateFromSurveySchema,
  bulkUpdateLineItemsSchema,
} from '@/lib/validations/estimates'

describe('estimateStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = ['draft', 'pending_review', 'approved', 'sent', 'accepted', 'rejected', 'expired']
    for (const status of statuses) {
      const result = estimateStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = estimateStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('lineItemTypeSchema', () => {
  it('accepts valid types', () => {
    const types = ['labor', 'material', 'equipment', 'disposal', 'travel', 'other']
    for (const type of types) {
      const result = lineItemTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid type', () => {
    const result = lineItemTypeSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('createEstimateSchema', () => {
  const validEstimate = {
    customer_id: '550e8400-e29b-41d4-a716-446655440000',
    project_name: 'Test Project',
  }

  it('accepts valid estimate', () => {
    const result = createEstimateSchema.safeParse(validEstimate)
    expect(result.success).toBe(true)
  })

  it('requires customer_id', () => {
    const result = createEstimateSchema.safeParse({
      project_name: 'Test Project',
    })
    expect(result.success).toBe(false)
  })

  it('requires valid UUID for customer_id', () => {
    const result = createEstimateSchema.safeParse({
      customer_id: 'not-a-uuid',
      project_name: 'Test Project',
    })
    expect(result.success).toBe(false)
  })

  it('requires project_name', () => {
    const result = createEstimateSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty project_name', () => {
    const result = createEstimateSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      project_name: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all optional fields', () => {
    const result = createEstimateSchema.safeParse({
      ...validEstimate,
      site_survey_id: '550e8400-e29b-41d4-a716-446655440001',
      scope_of_work: 'Test scope',
      estimated_duration_days: 5,
      estimated_start_date: '2024-01-01',
      estimated_end_date: '2024-01-05',
      markup_percent: 20,
      discount_percent: 10,
      tax_percent: 8.5,
      notes: 'Customer notes',
      internal_notes: 'Internal notes',
    })
    expect(result.success).toBe(true)
  })

  it('validates date format', () => {
    const result = createEstimateSchema.safeParse({
      ...validEstimate,
      estimated_start_date: '01-01-2024',
    })
    expect(result.success).toBe(false)
  })

  it('validates markup_percent range', () => {
    const result = createEstimateSchema.safeParse({
      ...validEstimate,
      markup_percent: 150,
    })
    expect(result.success).toBe(false)
  })

  it('validates discount_percent range', () => {
    const result = createEstimateSchema.safeParse({
      ...validEstimate,
      discount_percent: -10,
    })
    expect(result.success).toBe(false)
  })

  it('validates estimated_duration_days is positive', () => {
    const result = createEstimateSchema.safeParse({
      ...validEstimate,
      estimated_duration_days: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('updateEstimateSchema', () => {
  it('accepts partial update', () => {
    const result = updateEstimateSchema.safeParse({
      project_name: 'Updated Project',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateEstimateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts status update', () => {
    const result = updateEstimateSchema.safeParse({
      status: 'approved',
    })
    expect(result.success).toBe(true)
  })

  it('validates fields when provided', () => {
    const result = updateEstimateSchema.safeParse({
      markup_percent: 150,
    })
    expect(result.success).toBe(false)
  })
})

describe('addLineItemSchema', () => {
  const validLineItem = {
    item_type: 'labor' as const,
    description: 'Test labor',
    quantity: 10,
    unit_price: 50,
  }

  it('accepts valid line item', () => {
    const result = addLineItemSchema.safeParse(validLineItem)
    expect(result.success).toBe(true)
  })

  it('requires item_type', () => {
    const result = addLineItemSchema.safeParse({
      description: 'Test',
      quantity: 1,
      unit_price: 100,
    })
    expect(result.success).toBe(false)
  })

  it('requires description', () => {
    const result = addLineItemSchema.safeParse({
      item_type: 'labor',
      quantity: 1,
      unit_price: 100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    const result = addLineItemSchema.safeParse({
      item_type: 'labor',
      description: '',
      quantity: 1,
      unit_price: 100,
    })
    expect(result.success).toBe(false)
  })

  it('requires positive quantity', () => {
    const result = addLineItemSchema.safeParse({
      ...validLineItem,
      quantity: 0,
    })
    expect(result.success).toBe(false)
  })

  it('requires non-negative unit_price', () => {
    const result = addLineItemSchema.safeParse({
      ...validLineItem,
      unit_price: -10,
    })
    expect(result.success).toBe(false)
  })

  it('defaults is_optional to false', () => {
    const result = addLineItemSchema.safeParse(validLineItem)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_optional).toBe(false)
    }
  })

  it('defaults is_included to true', () => {
    const result = addLineItemSchema.safeParse(validLineItem)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_included).toBe(true)
    }
  })
})

describe('updateLineItemSchema', () => {
  it('accepts partial update', () => {
    const result = updateLineItemSchema.safeParse({
      quantity: 20,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateLineItemSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('validates quantity when provided', () => {
    const result = updateLineItemSchema.safeParse({
      quantity: 0,
    })
    expect(result.success).toBe(false)
  })

  it('validates unit_price when provided', () => {
    const result = updateLineItemSchema.safeParse({
      unit_price: -10,
    })
    expect(result.success).toBe(false)
  })
})

describe('approveEstimateSchema', () => {
  it('accepts valid approval', () => {
    const result = approveEstimateSchema.safeParse({
      notes: 'Approved with minor changes',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = approveEstimateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects notes exceeding max length', () => {
    const result = approveEstimateSchema.safeParse({
      notes: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})

describe('estimateListQuerySchema', () => {
  it('accepts valid query', () => {
    const result = estimateListQuerySchema.safeParse({
      status: 'draft',
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      limit: '10',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = estimateListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows passthrough of additional fields', () => {
    const result = estimateListQuerySchema.safeParse({
      custom_field: 'value',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.custom_field).toBe('value')
    }
  })
})

describe('createEstimateFromSurveySchema', () => {
  it('accepts valid input', () => {
    const result = createEstimateFromSurveySchema.safeParse({
      site_survey_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('requires site_survey_id', () => {
    const result = createEstimateFromSurveySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('requires valid UUID', () => {
    const result = createEstimateFromSurveySchema.safeParse({
      site_survey_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all optional fields', () => {
    const result = createEstimateFromSurveySchema.safeParse({
      site_survey_id: '550e8400-e29b-41d4-a716-446655440000',
      customer_id: '550e8400-e29b-41d4-a716-446655440001',
      project_name: 'Test Project',
      project_description: 'Test Description',
      scope_of_work: 'Test Scope',
      estimated_duration_days: 5,
      estimated_start_date: '2024-01-01',
      estimated_end_date: '2024-01-05',
      valid_until: '2024-02-01',
      markup_percent: 20,
      internal_notes: 'Internal notes',
    })
    expect(result.success).toBe(true)
  })
})

describe('bulkUpdateLineItemsSchema', () => {
  it('accepts valid bulk update', () => {
    const result = bulkUpdateLineItemsSchema.safeParse({
      line_items: [
        { id: '550e8400-e29b-41d4-a716-446655440000', quantity: 10 },
        { id: '550e8400-e29b-41d4-a716-446655440001', unit_price: 50 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('requires line_items array', () => {
    const result = bulkUpdateLineItemsSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('requires valid UUID for each item', () => {
    const result = bulkUpdateLineItemsSchema.safeParse({
      line_items: [{ id: 'not-a-uuid', quantity: 10 }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty array', () => {
    const result = bulkUpdateLineItemsSchema.safeParse({
      line_items: [],
    })
    expect(result.success).toBe(true)
  })
})
