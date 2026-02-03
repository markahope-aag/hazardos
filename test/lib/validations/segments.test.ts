import { describe, it, expect } from 'vitest'
import { 
  segmentTypeSchema,
  segmentRuleOperatorSchema,
  segmentRuleSchema,
  createSegmentSchema,
  updateSegmentSchema
} from '@/lib/validations/segments'

describe('segments validations', () => {
  describe('segmentTypeSchema', () => {
    it('should validate dynamic type', () => {
      const result = segmentTypeSchema.safeParse('dynamic')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('dynamic')
      }
    })

    it('should validate static type', () => {
      const result = segmentTypeSchema.safeParse('static')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('static')
      }
    })

    it('should reject invalid type', () => {
      const result = segmentTypeSchema.safeParse('invalid')
      expect(result.success).toBe(false)
    })
  })

  describe('segmentRuleOperatorSchema', () => {
    const validOperators = [
      '=', '!=', '>', '<', '>=', '<=',
      'contains', 'not_contains', 'starts_with', 'ends_with',
      'is_null', 'is_not_null'
    ]

    it('should validate all valid operators', () => {
      for (const operator of validOperators) {
        const result = segmentRuleOperatorSchema.safeParse(operator)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(operator)
        }
      }
    })

    it('should reject invalid operator', () => {
      const result = segmentRuleOperatorSchema.safeParse('invalid_operator')
      expect(result.success).toBe(false)
    })
  })

  describe('segmentRuleSchema', () => {
    it('should validate rule with string value', () => {
      const validRule = {
        field: 'name',
        operator: '=',
        value: 'John Doe'
      }
      
      const result = segmentRuleSchema.safeParse(validRule)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.field).toBe('name')
        expect(result.data.operator).toBe('=')
        expect(result.data.value).toBe('John Doe')
      }
    })

    it('should validate rule with number value', () => {
      const validRule = {
        field: 'age',
        operator: '>',
        value: 25
      }
      
      const result = segmentRuleSchema.safeParse(validRule)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.value).toBe(25)
      }
    })

    it('should validate rule with boolean value', () => {
      const validRule = {
        field: 'is_active',
        operator: '=',
        value: true
      }
      
      const result = segmentRuleSchema.safeParse(validRule)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.value).toBe(true)
      }
    })

    it('should validate rule without value (for null operators)', () => {
      const validRule = {
        field: 'deleted_at',
        operator: 'is_null'
      }
      
      const result = segmentRuleSchema.safeParse(validRule)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.value).toBeUndefined()
      }
    })

    it('should reject rule without field', () => {
      const invalidRule = {
        operator: '=',
        value: 'test'
      }
      
      const result = segmentRuleSchema.safeParse(invalidRule)
      expect(result.success).toBe(false)
    })
  })

  describe('createSegmentSchema', () => {
    it('should validate minimal segment creation', () => {
      const validData = {
        name: 'Test Segment'
      }
      
      const result = createSegmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Test Segment')
        expect(result.data.segment_type).toBe('dynamic') // default value
      }
    })

    it('should validate complete segment creation', () => {
      const validData = {
        name: 'Complete Segment',
        description: 'A complete segment with all fields',
        segment_type: 'static',
        rules: [
          {
            field: 'name',
            operator: 'contains',
            value: 'test'
          }
        ],
        customer_ids: ['123e4567-e89b-12d3-a456-426614174000']
      }
      
      const result = createSegmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Complete Segment')
        expect(result.data.description).toBe('A complete segment with all fields')
        expect(result.data.segment_type).toBe('static')
        expect(result.data.rules).toHaveLength(1)
        expect(result.data.customer_ids).toHaveLength(1)
      }
    })

    it('should reject empty name', () => {
      const invalidData = {
        name: ''
      }
      
      const result = createSegmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject name too long', () => {
      const invalidData = {
        name: 'a'.repeat(256)
      }
      
      const result = createSegmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject description too long', () => {
      const invalidData = {
        name: 'Test',
        description: 'a'.repeat(1001)
      }
      
      const result = createSegmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid customer ID UUIDs', () => {
      const invalidData = {
        name: 'Test',
        customer_ids: ['not-a-uuid']
      }
      
      const result = createSegmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('updateSegmentSchema', () => {
    it('should validate partial update', () => {
      const validData = {
        name: 'Updated Name'
      }
      
      const result = updateSegmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Updated Name')
      }
    })

    it('should validate complete update', () => {
      const validData = {
        name: 'Updated Segment',
        description: 'Updated description',
        rules: [
          {
            field: 'status',
            operator: '=',
            value: 'active'
          }
        ],
        is_active: false
      }
      
      const result = updateSegmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Updated Segment')
        expect(result.data.description).toBe('Updated description')
        expect(result.data.rules).toHaveLength(1)
        expect(result.data.is_active).toBe(false)
      }
    })

    it('should validate empty update object', () => {
      const validData = {}
      
      const result = updateSegmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty name when provided', () => {
      const invalidData = {
        name: ''
      }
      
      const result = updateSegmentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})