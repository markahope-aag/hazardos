import { describe, it, expect } from 'vitest'
import {
  estimateStatusSchema,
  lineItemTypeSchema,
  createEstimateSchema,
  updateEstimateSchema,
  addLineItemSchema,
  updateLineItemSchema,
  approveEstimateSchema,
  estimateListQuerySchema
} from '@/lib/validations/estimates'

describe('Estimate Validation Schemas', () => {
  describe('estimateStatusSchema', () => {
    it('should accept all valid status values', () => {
      const validStatuses = [
        'draft',
        'pending_review',
        'approved',
        'sent',
        'accepted',
        'rejected',
        'expired'
      ]
      validStatuses.forEach(status => {
        expect(estimateStatusSchema.safeParse(status).success).toBe(true)
      })
    })

    it('should reject invalid status', () => {
      expect(estimateStatusSchema.safeParse('invalid').success).toBe(false)
      expect(estimateStatusSchema.safeParse('').success).toBe(false)
      expect(estimateStatusSchema.safeParse('DRAFT').success).toBe(false)
    })
  })

  describe('lineItemTypeSchema', () => {
    it('should accept all valid line item types', () => {
      const validTypes = ['labor', 'material', 'equipment', 'disposal', 'travel', 'other']
      validTypes.forEach(type => {
        expect(lineItemTypeSchema.safeParse(type).success).toBe(true)
      })
    })

    it('should reject invalid type', () => {
      expect(lineItemTypeSchema.safeParse('invalid').success).toBe(false)
      expect(lineItemTypeSchema.safeParse('').success).toBe(false)
    })
  })

  describe('createEstimateSchema', () => {
    const validEstimate = {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      project_name: 'Asbestos Removal Project'
    }

    it('should accept valid minimal estimate', () => {
      const result = createEstimateSchema.safeParse(validEstimate)
      expect(result.success).toBe(true)
    })

    it('should accept full estimate with all fields', () => {
      const result = createEstimateSchema.safeParse({
        ...validEstimate,
        site_survey_id: '550e8400-e29b-41d4-a716-446655440001',
        scope_of_work: 'Complete removal of asbestos from ceiling tiles',
        estimated_duration_days: 5,
        estimated_start_date: '2026-02-01',
        estimated_end_date: '2026-02-05',
        markup_percent: 25,
        discount_percent: 10,
        tax_percent: 8.5,
        notes: 'Customer requested weekend work',
        internal_notes: 'Priority project'
      })
      expect(result.success).toBe(true)
    })

    it('should require customer_id', () => {
      const result = createEstimateSchema.safeParse({
        project_name: 'Test Project'
      })
      expect(result.success).toBe(false)
    })

    it('should require valid UUID for customer_id', () => {
      const result = createEstimateSchema.safeParse({
        customer_id: 'not-a-uuid',
        project_name: 'Test Project'
      })
      expect(result.success).toBe(false)
    })

    it('should require project_name', () => {
      const result = createEstimateSchema.safeParse({
        customer_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty project_name', () => {
      const result = createEstimateSchema.safeParse({
        ...validEstimate,
        project_name: ''
      })
      expect(result.success).toBe(false)
    })

    it('should reject project_name exceeding 255 characters', () => {
      const result = createEstimateSchema.safeParse({
        ...validEstimate,
        project_name: 'x'.repeat(256)
      })
      expect(result.success).toBe(false)
    })

    it('should reject scope_of_work exceeding 5000 characters', () => {
      const result = createEstimateSchema.safeParse({
        ...validEstimate,
        scope_of_work: 'x'.repeat(5001)
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative estimated_duration_days', () => {
      const result = createEstimateSchema.safeParse({
        ...validEstimate,
        estimated_duration_days: -1
      })
      expect(result.success).toBe(false)
    })

    it('should reject zero estimated_duration_days', () => {
      const result = createEstimateSchema.safeParse({
        ...validEstimate,
        estimated_duration_days: 0
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer estimated_duration_days', () => {
      const result = createEstimateSchema.safeParse({
        ...validEstimate,
        estimated_duration_days: 1.5
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid date format for estimated_start_date', () => {
      const result = createEstimateSchema.safeParse({
        ...validEstimate,
        estimated_start_date: '02-01-2026'
      })
      expect(result.success).toBe(false)
    })

    it('should reject markup_percent over 100', () => {
      const result = createEstimateSchema.safeParse({
        ...validEstimate,
        markup_percent: 101
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative discount_percent', () => {
      const result = createEstimateSchema.safeParse({
        ...validEstimate,
        discount_percent: -5
      })
      expect(result.success).toBe(false)
    })

    it('should reject notes exceeding 2000 characters', () => {
      const result = createEstimateSchema.safeParse({
        ...validEstimate,
        notes: 'x'.repeat(2001)
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateEstimateSchema', () => {
    it('should accept empty update (all fields optional)', () => {
      const result = updateEstimateSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept partial update with project_name', () => {
      const result = updateEstimateSchema.safeParse({
        project_name: 'Updated Project Name'
      })
      expect(result.success).toBe(true)
    })

    it('should accept status update', () => {
      const result = updateEstimateSchema.safeParse({
        status: 'approved'
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty project_name', () => {
      const result = updateEstimateSchema.safeParse({
        project_name: ''
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid status', () => {
      const result = updateEstimateSchema.safeParse({
        status: 'invalid_status'
      })
      expect(result.success).toBe(false)
    })

    it('should accept decimal percentages', () => {
      const result = updateEstimateSchema.safeParse({
        markup_percent: 25.5,
        discount_percent: 10.25,
        tax_percent: 8.875
      })
      expect(result.success).toBe(true)
    })
  })

  describe('addLineItemSchema', () => {
    const validLineItem = {
      item_type: 'labor',
      description: 'Worker hours for asbestos removal',
      quantity: 40,
      unit_price: 75
    }

    it('should accept valid line item', () => {
      const result = addLineItemSchema.safeParse(validLineItem)
      expect(result.success).toBe(true)
    })

    it('should accept line item with all fields', () => {
      const result = addLineItemSchema.safeParse({
        ...validLineItem,
        category: 'Hazmat Technician',
        unit: 'hours',
        is_optional: true,
        is_included: false,
        sort_order: 1
      })
      expect(result.success).toBe(true)
    })

    it('should require item_type', () => {
      const { item_type, ...withoutType } = validLineItem
      const result = addLineItemSchema.safeParse(withoutType)
      expect(result.success).toBe(false)
    })

    it('should require description', () => {
      const { description, ...withoutDesc } = validLineItem
      const result = addLineItemSchema.safeParse(withoutDesc)
      expect(result.success).toBe(false)
    })

    it('should reject empty description', () => {
      const result = addLineItemSchema.safeParse({
        ...validLineItem,
        description: ''
      })
      expect(result.success).toBe(false)
    })

    it('should reject description exceeding 500 characters', () => {
      const result = addLineItemSchema.safeParse({
        ...validLineItem,
        description: 'x'.repeat(501)
      })
      expect(result.success).toBe(false)
    })

    it('should require quantity', () => {
      const { quantity, ...withoutQty } = validLineItem
      const result = addLineItemSchema.safeParse(withoutQty)
      expect(result.success).toBe(false)
    })

    it('should reject zero quantity', () => {
      const result = addLineItemSchema.safeParse({
        ...validLineItem,
        quantity: 0
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative quantity', () => {
      const result = addLineItemSchema.safeParse({
        ...validLineItem,
        quantity: -5
      })
      expect(result.success).toBe(false)
    })

    it('should accept decimal quantity', () => {
      const result = addLineItemSchema.safeParse({
        ...validLineItem,
        quantity: 2.5
      })
      expect(result.success).toBe(true)
    })

    it('should require unit_price', () => {
      const { unit_price, ...withoutPrice } = validLineItem
      const result = addLineItemSchema.safeParse(withoutPrice)
      expect(result.success).toBe(false)
    })

    it('should accept zero unit_price', () => {
      const result = addLineItemSchema.safeParse({
        ...validLineItem,
        unit_price: 0
      })
      expect(result.success).toBe(true)
    })

    it('should reject negative unit_price', () => {
      const result = addLineItemSchema.safeParse({
        ...validLineItem,
        unit_price: -50
      })
      expect(result.success).toBe(false)
    })

    it('should default is_optional to false', () => {
      const result = addLineItemSchema.safeParse(validLineItem)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_optional).toBe(false)
      }
    })

    it('should default is_included to true', () => {
      const result = addLineItemSchema.safeParse(validLineItem)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_included).toBe(true)
      }
    })

    it('should reject category exceeding 100 characters', () => {
      const result = addLineItemSchema.safeParse({
        ...validLineItem,
        category: 'x'.repeat(101)
      })
      expect(result.success).toBe(false)
    })

    it('should reject unit exceeding 20 characters', () => {
      const result = addLineItemSchema.safeParse({
        ...validLineItem,
        unit: 'x'.repeat(21)
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateLineItemSchema', () => {
    it('should accept empty update', () => {
      const result = updateLineItemSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept partial update', () => {
      const result = updateLineItemSchema.safeParse({
        quantity: 50,
        unit_price: 80
      })
      expect(result.success).toBe(true)
    })

    it('should accept item_type update', () => {
      const result = updateLineItemSchema.safeParse({
        item_type: 'equipment'
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty description', () => {
      const result = updateLineItemSchema.safeParse({
        description: ''
      })
      expect(result.success).toBe(false)
    })

    it('should accept boolean updates', () => {
      const result = updateLineItemSchema.safeParse({
        is_optional: true,
        is_included: false
      })
      expect(result.success).toBe(true)
    })
  })

  describe('approveEstimateSchema', () => {
    it('should accept empty approval', () => {
      const result = approveEstimateSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept approval with notes', () => {
      const result = approveEstimateSchema.safeParse({
        notes: 'Approved for Q1 2026 budget'
      })
      expect(result.success).toBe(true)
    })

    it('should reject notes exceeding 1000 characters', () => {
      const result = approveEstimateSchema.safeParse({
        notes: 'x'.repeat(1001)
      })
      expect(result.success).toBe(false)
    })
  })

  describe('estimateListQuerySchema', () => {
    it('should accept empty query', () => {
      const result = estimateListQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept status filter', () => {
      const result = estimateListQuerySchema.safeParse({
        status: 'approved'
      })
      expect(result.success).toBe(true)
    })

    it('should accept customer_id filter', () => {
      const result = estimateListQuerySchema.safeParse({
        customer_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid customer_id UUID', () => {
      const result = estimateListQuerySchema.safeParse({
        customer_id: 'not-a-uuid'
      })
      expect(result.success).toBe(false)
    })

    it('should accept date range filters', () => {
      const result = estimateListQuerySchema.safeParse({
        from_date: '2026-01-01',
        to_date: '2026-12-31'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid date format', () => {
      const result = estimateListQuerySchema.safeParse({
        from_date: '01-01-2026'
      })
      expect(result.success).toBe(false)
    })

    it('should transform pagination strings to numbers', () => {
      const result = estimateListQuerySchema.safeParse({
        limit: '20',
        offset: '10'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(20)
        expect(result.data.offset).toBe(10)
      }
    })

    it('should accept combined filters', () => {
      const result = estimateListQuerySchema.safeParse({
        status: 'pending_review',
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        from_date: '2026-01-01',
        to_date: '2026-06-30',
        limit: '50',
        offset: '0'
      })
      expect(result.success).toBe(true)
    })
  })
})
