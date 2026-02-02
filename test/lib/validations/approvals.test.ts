import { describe, it, expect } from 'vitest'
import {
  approvalEntityTypeSchema,
  approvalStatusSchema,
  approvalListQuerySchema,
  createApprovalSchema,
  processApprovalSchema,
} from '@/lib/validations/approvals'

describe('approvalEntityTypeSchema', () => {
  it('accepts valid entity types', () => {
    const types = ['estimate', 'discount', 'proposal', 'change_order', 'expense']
    for (const type of types) {
      const result = approvalEntityTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid entity type', () => {
    const result = approvalEntityTypeSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('approvalStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = ['pending', 'approved', 'rejected']
    for (const status of statuses) {
      const result = approvalStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = approvalStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('approvalListQuerySchema', () => {
  it('accepts valid query', () => {
    const result = approvalListQuerySchema.safeParse({
      entity_type: 'estimate',
      status: 'pending',
      limit: '10',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = approvalListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('transforms string to number', () => {
    const result = approvalListQuerySchema.safeParse({
      limit: '25',
      offset: '10',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(25)
      expect(result.data.offset).toBe(10)
    }
  })

  it('accepts pending_only', () => {
    const result = approvalListQuerySchema.safeParse({
      pending_only: 'true',
    })
    expect(result.success).toBe(true)
  })

  it('allows passthrough of additional fields', () => {
    const result = approvalListQuerySchema.safeParse({
      custom_field: 'value',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.custom_field).toBe('value')
    }
  })
})

describe('createApprovalSchema', () => {
  const validApproval = {
    entity_type: 'estimate' as const,
    entity_id: '550e8400-e29b-41d4-a716-446655440000',
  }

  it('accepts valid approval', () => {
    const result = createApprovalSchema.safeParse(validApproval)
    expect(result.success).toBe(true)
  })

  it('requires entity_type', () => {
    const result = createApprovalSchema.safeParse({
      entity_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('requires entity_id', () => {
    const result = createApprovalSchema.safeParse({
      entity_type: 'estimate',
    })
    expect(result.success).toBe(false)
  })

  it('requires valid UUID for entity_id', () => {
    const result = createApprovalSchema.safeParse({
      entity_type: 'estimate',
      entity_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional amount', () => {
    const result = createApprovalSchema.safeParse({
      ...validApproval,
      amount: 1000,
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional notes', () => {
    const result = createApprovalSchema.safeParse({
      ...validApproval,
      notes: 'Please review this estimate',
    })
    expect(result.success).toBe(true)
  })

  it('rejects notes exceeding max length', () => {
    const result = createApprovalSchema.safeParse({
      ...validApproval,
      notes: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})

describe('processApprovalSchema', () => {
  it('accepts approve action', () => {
    const result = processApprovalSchema.safeParse({
      action: 'approve',
    })
    expect(result.success).toBe(true)
  })

  it('accepts reject action', () => {
    const result = processApprovalSchema.safeParse({
      action: 'reject',
    })
    expect(result.success).toBe(true)
  })

  it('requires action', () => {
    const result = processApprovalSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid action', () => {
    const result = processApprovalSchema.safeParse({
      action: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional notes', () => {
    const result = processApprovalSchema.safeParse({
      action: 'approve',
      notes: 'Looks good',
    })
    expect(result.success).toBe(true)
  })

  it('rejects notes exceeding max length', () => {
    const result = processApprovalSchema.safeParse({
      action: 'approve',
      notes: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})
