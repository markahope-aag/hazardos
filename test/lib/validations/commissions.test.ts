import { describe, it, expect } from 'vitest'
import {
  commissionStatusSchema,
  commissionListQuerySchema,
  createCommissionSchema,
  updateCommissionSchema,
  commissionTypeSchema,
  commissionAppliesToSchema,
  commissionTierSchema,
  createCommissionPlanSchema,
  updateCommissionPlanSchema,
  commissionSummaryQuerySchema,
} from '@/lib/validations/commissions'

describe('commissionStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = ['pending', 'approved', 'paid']
    for (const status of statuses) {
      const result = commissionStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = commissionStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('commissionListQuerySchema', () => {
  it('accepts valid query', () => {
    const result = commissionListQuerySchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'pending',
      limit: '10',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = commissionListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('transforms string to number', () => {
    const result = commissionListQuerySchema.safeParse({
      limit: '25',
      offset: '10',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(25)
      expect(result.data.offset).toBe(10)
    }
  })

  it('accepts pay_period', () => {
    const result = commissionListQuerySchema.safeParse({
      pay_period: '2024-01',
    })
    expect(result.success).toBe(true)
  })
})

describe('createCommissionSchema', () => {
  const validCommission = {
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    plan_id: '550e8400-e29b-41d4-a716-446655440001',
    base_amount: 10000,
  }

  it('accepts valid commission', () => {
    const result = createCommissionSchema.safeParse(validCommission)
    expect(result.success).toBe(true)
  })

  it('requires user_id', () => {
    const result = createCommissionSchema.safeParse({
      plan_id: '550e8400-e29b-41d4-a716-446655440001',
      base_amount: 10000,
    })
    expect(result.success).toBe(false)
  })

  it('requires valid UUID for user_id', () => {
    const result = createCommissionSchema.safeParse({
      user_id: 'not-a-uuid',
      plan_id: '550e8400-e29b-41d4-a716-446655440001',
      base_amount: 10000,
    })
    expect(result.success).toBe(false)
  })

  it('requires plan_id', () => {
    const result = createCommissionSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      base_amount: 10000,
    })
    expect(result.success).toBe(false)
  })

  it('requires non-negative base_amount', () => {
    const result = createCommissionSchema.safeParse({
      ...validCommission,
      base_amount: -100,
    })
    expect(result.success).toBe(false)
  })

  it('accepts zero base_amount', () => {
    const result = createCommissionSchema.safeParse({
      ...validCommission,
      base_amount: 0,
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional IDs', () => {
    const result = createCommissionSchema.safeParse({
      ...validCommission,
      opportunity_id: '550e8400-e29b-41d4-a716-446655440002',
      job_id: '550e8400-e29b-41d4-a716-446655440003',
      invoice_id: '550e8400-e29b-41d4-a716-446655440004',
    })
    expect(result.success).toBe(true)
  })
})

describe('updateCommissionSchema', () => {
  it('accepts valid update', () => {
    const result = updateCommissionSchema.safeParse({
      status: 'approved',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateCommissionSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts paid_at datetime', () => {
    const result = updateCommissionSchema.safeParse({
      status: 'paid',
      paid_at: '2024-01-15T10:00:00Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid paid_at format', () => {
    const result = updateCommissionSchema.safeParse({
      paid_at: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('commissionTypeSchema', () => {
  it('accepts valid types', () => {
    const types = ['percentage', 'flat', 'tiered']
    for (const type of types) {
      const result = commissionTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid type', () => {
    const result = commissionTypeSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('commissionAppliesToSchema', () => {
  it('accepts valid values', () => {
    const values = ['won', 'invoiced', 'paid']
    for (const value of values) {
      const result = commissionAppliesToSchema.safeParse(value)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid value', () => {
    const result = commissionAppliesToSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('commissionTierSchema', () => {
  it('accepts valid tier', () => {
    const result = commissionTierSchema.safeParse({
      min: 0,
      max: 10000,
      rate: 5,
    })
    expect(result.success).toBe(true)
  })

  it('accepts null max for unlimited', () => {
    const result = commissionTierSchema.safeParse({
      min: 10000,
      max: null,
      rate: 10,
    })
    expect(result.success).toBe(true)
  })

  it('requires non-negative min', () => {
    const result = commissionTierSchema.safeParse({
      min: -100,
      max: 10000,
      rate: 5,
    })
    expect(result.success).toBe(false)
  })

  it('requires non-negative rate', () => {
    const result = commissionTierSchema.safeParse({
      min: 0,
      max: 10000,
      rate: -5,
    })
    expect(result.success).toBe(false)
  })
})

describe('createCommissionPlanSchema', () => {
  const validPlan = {
    name: 'Sales Plan A',
    commission_type: 'percentage' as const,
  }

  it('accepts valid plan', () => {
    const result = createCommissionPlanSchema.safeParse(validPlan)
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = createCommissionPlanSchema.safeParse({
      commission_type: 'percentage',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createCommissionPlanSchema.safeParse({
      name: '',
      commission_type: 'percentage',
    })
    expect(result.success).toBe(false)
  })

  it('requires commission_type', () => {
    const result = createCommissionPlanSchema.safeParse({
      name: 'Plan A',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const result = createCommissionPlanSchema.safeParse({
      ...validPlan,
      base_rate: 10,
      tiers: [{ min: 0, max: 10000, rate: 5 }],
      applies_to: 'won',
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative base_rate', () => {
    const result = createCommissionPlanSchema.safeParse({
      ...validPlan,
      base_rate: -10,
    })
    expect(result.success).toBe(false)
  })
})

describe('updateCommissionPlanSchema', () => {
  it('accepts partial update', () => {
    const result = updateCommissionPlanSchema.safeParse({
      name: 'Updated Plan',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateCommissionPlanSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts is_active', () => {
    const result = updateCommissionPlanSchema.safeParse({
      is_active: false,
    })
    expect(result.success).toBe(true)
  })
})

describe('commissionSummaryQuerySchema', () => {
  it('accepts valid query', () => {
    const result = commissionSummaryQuerySchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = commissionSummaryQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows passthrough of additional fields', () => {
    const result = commissionSummaryQuerySchema.safeParse({
      custom_field: 'value',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.custom_field).toBe('value')
    }
  })
})
