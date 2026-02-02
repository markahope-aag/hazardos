import { describe, it, expect } from 'vitest'
import {
  createLaborRateSchema,
  updateLaborRateSchema,
  deleteLaborRateQuerySchema,
  createDisposalFeeSchema,
  updateDisposalFeeSchema,
  deleteDisposalFeeQuerySchema as _deleteDisposalFeeQuerySchema,
  createMaterialCostSchema,
  updateMaterialCostSchema as _updateMaterialCostSchema,
  deleteMaterialCostQuerySchema as _deleteMaterialCostQuerySchema,
  createTravelRateSchema,
  updateTravelRateSchema,
  deleteTravelRateQuerySchema as _deleteTravelRateQuerySchema,
  createEquipmentRateSchema,
  updateEquipmentRateSchema,
  deleteEquipmentRateQuerySchema,
  updatePricingSettingsSchema,
} from '@/lib/validations/settings'

describe('createLaborRateSchema', () => {
  it('accepts valid labor rate', () => {
    const result = createLaborRateSchema.safeParse({
      name: 'Standard Labor',
      rate_per_hour: 75,
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = createLaborRateSchema.safeParse({
      rate_per_hour: 75,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createLaborRateSchema.safeParse({
      name: '',
      rate_per_hour: 75,
    })
    expect(result.success).toBe(false)
  })

  it('requires positive rate', () => {
    const result = createLaborRateSchema.safeParse({
      name: 'Standard',
      rate_per_hour: 0,
    })
    expect(result.success).toBe(false)
  })

  it('defaults is_default to false', () => {
    const result = createLaborRateSchema.safeParse({
      name: 'Standard',
      rate_per_hour: 75,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_default).toBe(false)
    }
  })
})

describe('updateLaborRateSchema', () => {
  it('accepts valid update', () => {
    const result = updateLaborRateSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Updated Rate',
    })
    expect(result.success).toBe(true)
  })

  it('requires id', () => {
    const result = updateLaborRateSchema.safeParse({
      name: 'Updated Rate',
    })
    expect(result.success).toBe(false)
  })

  it('requires valid UUID', () => {
    const result = updateLaborRateSchema.safeParse({
      id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })
})

describe('deleteLaborRateQuerySchema', () => {
  it('accepts valid id', () => {
    const result = deleteLaborRateQuerySchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('requires id', () => {
    const result = deleteLaborRateQuerySchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('createDisposalFeeSchema', () => {
  it('accepts valid disposal fee', () => {
    const result = createDisposalFeeSchema.safeParse({
      hazard_type: 'asbestos',
      cost_per_cubic_yard: 150,
    })
    expect(result.success).toBe(true)
  })

  it('requires hazard_type', () => {
    const result = createDisposalFeeSchema.safeParse({
      cost_per_cubic_yard: 150,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty hazard_type', () => {
    const result = createDisposalFeeSchema.safeParse({
      hazard_type: '',
      cost_per_cubic_yard: 150,
    })
    expect(result.success).toBe(false)
  })

  it('requires non-negative cost', () => {
    const result = createDisposalFeeSchema.safeParse({
      hazard_type: 'asbestos',
      cost_per_cubic_yard: -50,
    })
    expect(result.success).toBe(false)
  })

  it('accepts zero cost', () => {
    const result = createDisposalFeeSchema.safeParse({
      hazard_type: 'asbestos',
      cost_per_cubic_yard: 0,
    })
    expect(result.success).toBe(true)
  })
})

describe('updateDisposalFeeSchema', () => {
  it('accepts valid update', () => {
    const result = updateDisposalFeeSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      cost_per_cubic_yard: 200,
    })
    expect(result.success).toBe(true)
  })

  it('requires id', () => {
    const result = updateDisposalFeeSchema.safeParse({
      cost_per_cubic_yard: 200,
    })
    expect(result.success).toBe(false)
  })
})

describe('createMaterialCostSchema', () => {
  it('accepts valid material cost', () => {
    const result = createMaterialCostSchema.safeParse({
      name: 'Plastic Sheeting',
      cost_per_unit: 25,
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = createMaterialCostSchema.safeParse({
      cost_per_unit: 25,
    })
    expect(result.success).toBe(false)
  })

  it('requires non-negative cost', () => {
    const result = createMaterialCostSchema.safeParse({
      name: 'Material',
      cost_per_unit: -10,
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const result = createMaterialCostSchema.safeParse({
      name: 'Plastic Sheeting',
      cost_per_unit: 25,
      unit: 'roll',
      description: 'Heavy duty sheeting',
    })
    expect(result.success).toBe(true)
  })
})

describe('createTravelRateSchema', () => {
  it('accepts valid travel rate', () => {
    const result = createTravelRateSchema.safeParse({
      min_miles: 0,
      max_miles: 50,
      flat_fee: 50,
    })
    expect(result.success).toBe(true)
  })

  it('requires non-negative min_miles', () => {
    const result = createTravelRateSchema.safeParse({
      min_miles: -10,
    })
    expect(result.success).toBe(false)
  })

  it('accepts null max_miles', () => {
    const result = createTravelRateSchema.safeParse({
      min_miles: 50,
      max_miles: null,
      per_mile_rate: 0.75,
    })
    expect(result.success).toBe(true)
  })

  it('accepts null flat_fee', () => {
    const result = createTravelRateSchema.safeParse({
      min_miles: 0,
      flat_fee: null,
      per_mile_rate: 0.5,
    })
    expect(result.success).toBe(true)
  })
})

describe('updateTravelRateSchema', () => {
  it('accepts valid update', () => {
    const result = updateTravelRateSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      flat_fee: 75,
    })
    expect(result.success).toBe(true)
  })

  it('requires id', () => {
    const result = updateTravelRateSchema.safeParse({
      flat_fee: 75,
    })
    expect(result.success).toBe(false)
  })

  it('accepts is_active', () => {
    const result = updateTravelRateSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      is_active: false,
    })
    expect(result.success).toBe(true)
  })
})

describe('createEquipmentRateSchema', () => {
  it('accepts valid equipment rate', () => {
    const result = createEquipmentRateSchema.safeParse({
      name: 'HEPA Vacuum',
      rate_per_day: 150,
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = createEquipmentRateSchema.safeParse({
      rate_per_day: 150,
    })
    expect(result.success).toBe(false)
  })

  it('requires non-negative rate', () => {
    const result = createEquipmentRateSchema.safeParse({
      name: 'Equipment',
      rate_per_day: -50,
    })
    expect(result.success).toBe(false)
  })

  it('accepts zero rate', () => {
    const result = createEquipmentRateSchema.safeParse({
      name: 'Equipment',
      rate_per_day: 0,
    })
    expect(result.success).toBe(true)
  })
})

describe('updateEquipmentRateSchema', () => {
  it('accepts valid update', () => {
    const result = updateEquipmentRateSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      rate_per_day: 175,
    })
    expect(result.success).toBe(true)
  })

  it('requires id', () => {
    const result = updateEquipmentRateSchema.safeParse({
      rate_per_day: 175,
    })
    expect(result.success).toBe(false)
  })
})

describe('deleteEquipmentRateQuerySchema', () => {
  it('accepts valid id', () => {
    const result = deleteEquipmentRateQuerySchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('requires id', () => {
    const result = deleteEquipmentRateQuerySchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('updatePricingSettingsSchema', () => {
  it('accepts valid settings', () => {
    const result = updatePricingSettingsSchema.safeParse({
      default_markup_percentage: 25,
      default_tax_rate: 8.5,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updatePricingSettingsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('validates markup range (0-100)', () => {
    const valid = updatePricingSettingsSchema.safeParse({
      default_markup_percentage: 50,
    })
    expect(valid.success).toBe(true)

    const tooLow = updatePricingSettingsSchema.safeParse({
      default_markup_percentage: -10,
    })
    expect(tooLow.success).toBe(false)

    const tooHigh = updatePricingSettingsSchema.safeParse({
      default_markup_percentage: 150,
    })
    expect(tooHigh.success).toBe(false)
  })

  it('validates tax rate range (0-100)', () => {
    const valid = updatePricingSettingsSchema.safeParse({
      default_tax_rate: 10,
    })
    expect(valid.success).toBe(true)

    const tooHigh = updatePricingSettingsSchema.safeParse({
      default_tax_rate: 150,
    })
    expect(tooHigh.success).toBe(false)
  })

  it('accepts rounding_method', () => {
    const methods = ['none', 'nearest', 'up', 'down'] as const
    for (const method of methods) {
      const result = updatePricingSettingsSchema.safeParse({
        rounding_method: method,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid rounding_method', () => {
    const result = updatePricingSettingsSchema.safeParse({
      rounding_method: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts currency', () => {
    const result = updatePricingSettingsSchema.safeParse({
      currency: 'USD',
    })
    expect(result.success).toBe(true)
  })
})
