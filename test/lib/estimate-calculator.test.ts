import { describe, it, expect } from 'vitest'
import { EstimateCalculator, createEstimateCalculator } from '@/lib/services/estimate-calculator'
import type { SiteSurvey, LaborRate, EquipmentRate, MaterialCost, DisposalFee, TravelRate, PricingSetting } from '@/types/database'

// Helper to create a minimal SiteSurvey object for tests
function createSurvey(overrides: Partial<SiteSurvey> = {}): SiteSurvey {
  const base: Partial<SiteSurvey> = {
    id: 'survey-1',
    organization_id: 'org-1',
    hazard_type: 'asbestos',
    containment_level: 2,
    area_sqft: 1000,
    linear_ft: null,
    volume_cuft: null,
    clearance_required: true,
    regulatory_notifications_needed: true,
  }

  return { ...(base as SiteSurvey), ...overrides }
}

// Helper to create pricing data
function createPricingData(): {
  laborRates: LaborRate[]
  equipmentRates: EquipmentRate[]
  materialCosts: MaterialCost[]
  disposalFees: DisposalFee[]
  travelRates: TravelRate[]
  pricingSettings: PricingSetting | null
} {
  const laborRates: LaborRate[] = [
    {
      id: 'labor-supervisor',
      organization_id: 'org-1',
      role_title: 'Supervisor',
      hourly_rate: 100,
      overtime_rate: 150,
      is_active: true,
      created_at: '' as any,
      updated_at: '' as any,
    },
    {
      id: 'labor-tech',
      organization_id: 'org-1',
      role_title: 'Technician',
      hourly_rate: 60,
      overtime_rate: 90,
      is_active: true,
      created_at: '' as any,
      updated_at: '' as any,
    },
  ]

  const equipmentRates: EquipmentRate[] = [
    {
      id: 'equip-hepa',
      organization_id: 'org-1',
      equipment_name: 'HEPA Vacuum',
      hourly_rate: null,
      daily_rate: 80,
      weekly_rate: null,
      monthly_rate: null,
      is_active: true,
      created_at: '' as any,
      updated_at: '' as any,
    },
  ]

  const materialCosts: MaterialCost[] = [
    {
      id: 'mat-poly',
      organization_id: 'org-1',
      material_name: 'Poly Sheeting (6 mil)',
      unit: 'sqft',
      unit_cost: 0.2,
      is_active: true,
      created_at: '' as any,
      updated_at: '' as any,
    },
  ]

  const disposalFees: DisposalFee[] = [
    {
      id: 'disp-asb',
      organization_id: 'org-1',
      hazard_type: 'asbestos_friable',
      unit: 'cubic yard',
      unit_cost: 500,
      is_active: true,
      created_at: '' as any,
      updated_at: '' as any,
    },
  ]

  const travelRates: TravelRate[] = [
    {
      id: 'travel-flat',
      organization_id: 'org-1',
      description: 'Flat travel fee',
      flat_fee: 300,
      per_mile_rate: null,
      minimum_fee: null,
      is_active: true,
      created_at: '' as any,
      updated_at: '' as any,
    },
  ]

  const pricingSettings: PricingSetting = {
    id: 'pricing-1',
    organization_id: 'org-1',
    default_markup_percentage: 25,
    minimum_markup_percentage: 15,
    maximum_discount_percentage: 20,
    created_at: '' as any,
    updated_at: '' as any,
  }

  return {
    laborRates,
    equipmentRates,
    materialCosts,
    disposalFees,
    travelRates,
    pricingSettings,
  }
}

describe('EstimateCalculator', () => {
  function createCalculatorWithPricing(): EstimateCalculator {
    const calculator = new EstimateCalculator('org-1')
    // Bypass Supabase and inject pricing data directly
    ;(calculator as any).pricingData = createPricingData()
    return calculator
  }

  it('calculates a basic asbestos estimate with markup, travel, testing, and permits', async () => {
    const calculator = createCalculatorWithPricing()
    const survey = createSurvey({ hazard_type: 'asbestos', area_sqft: 1000, containment_level: 2 })

    const result = await calculator.calculateFromSurvey(survey)

    // Should produce multiple line items across categories
    expect(result.line_items.length).toBeGreaterThan(0)

    const laborItems = result.line_items.filter(i => i.item_type === 'labor')
    const equipmentItems = result.line_items.filter(i => i.item_type === 'equipment')
    const materialItems = result.line_items.filter(i => i.item_type === 'material')
    const disposalItems = result.line_items.filter(i => i.item_type === 'disposal')
    const travelItems = result.line_items.filter(i => i.item_type === 'travel')
    const testingItems = result.line_items.filter(i => i.item_type === 'testing')
    const permitItems = result.line_items.filter(i => i.item_type === 'permit')

    expect(laborItems.length).toBeGreaterThanOrEqual(2)
    expect(equipmentItems.length).toBeGreaterThan(0)
    expect(materialItems.length).toBeGreaterThan(0)
    expect(disposalItems.length).toBe(1)
    expect(travelItems.length).toBe(1)
    expect(testingItems.length).toBe(1)
    expect(permitItems.length).toBeGreaterThan(0)

    // Totals
    expect(result.subtotal).toBeGreaterThan(0)
    // Markup should use pricing settings default (25%)
    expect(result.markup_percent).toBe(25)
    expect(result.markup_amount).toBeCloseTo(result.subtotal * 0.25, 2)
    expect(result.total).toBeCloseTo(result.subtotal * 1.25, 2)

    // All included items should have sort_order assigned
    for (const item of result.line_items) {
      expect(item.sort_order).toBeTypeOf('number')
    }
  })

  it('respects option flags to disable travel, testing, and permits', async () => {
    const calculator = createCalculatorWithPricing()
    const survey = createSurvey({ hazard_type: 'mold', area_sqft: 800, containment_level: 1 })

    const result = await calculator.calculateFromSurvey(survey, {
      includeTravel: false,
      includeTesting: false,
      includePermits: false,
    })

    expect(result.line_items.some(i => i.item_type === 'travel')).toBe(false)
    expect(result.line_items.some(i => i.item_type === 'testing')).toBe(false)
    expect(result.line_items.some(i => i.item_type === 'permit')).toBe(false)

    // Still has labor, equipment, materials, disposal
    expect(result.line_items.some(i => i.item_type === 'labor')).toBe(true)
    expect(result.line_items.some(i => i.item_type === 'equipment')).toBe(true)
    expect(result.line_items.some(i => i.item_type === 'material')).toBe(true)
    expect(result.line_items.some(i => i.item_type === 'disposal')).toBe(true)
  })

  it('uses custom markup when provided', async () => {
    const calculator = createCalculatorWithPricing()
    const survey = createSurvey({ hazard_type: 'lead', area_sqft: 500 })

    const result = await calculator.calculateFromSurvey(survey, { customMarkup: 10 })

    expect(result.markup_percent).toBe(10)
    expect(result.markup_amount).toBeCloseTo(result.subtotal * 0.1, 2)
    expect(result.total).toBeCloseTo(result.subtotal * 1.1, 2)
  })

  it('falls back between area, linear feet, and volume when calculating area', async () => {
    const calculator = createCalculatorWithPricing()

    // 1) Explicit area_sqft
    const surveyArea = createSurvey({ area_sqft: 400, linear_ft: 100, volume_cuft: 800 })
    const resultArea = await calculator.calculateFromSurvey(surveyArea, {
      includeTravel: false,
      includeTesting: false,
      includePermits: false,
    })

    // 2) Fallback to linear_ft * 2
    const surveyLinear = createSurvey({ area_sqft: null as any, linear_ft: 200, volume_cuft: 800 })
    const resultLinear = await calculator.calculateFromSurvey(surveyLinear, {
      includeTravel: false,
      includeTesting: false,
      includePermits: false,
    })

    // 3) Fallback to volume / 8
    const surveyVolume = createSurvey({ area_sqft: null as any, linear_ft: null as any, volume_cuft: 1600 })
    const resultVolume = await calculator.calculateFromSurvey(surveyVolume, {
      includeTravel: false,
      includeTesting: false,
      includePermits: false,
    })

    expect(resultArea.subtotal).toBeGreaterThan(0)
    expect(resultLinear.subtotal).toBeGreaterThan(0)
    expect(resultVolume.subtotal).toBeGreaterThan(0)

    // Linear feet 200 -> area 400 sqft; volume 1600 cuft -> area 200 sqft
    expect(resultLinear.subtotal).toBeGreaterThan(resultVolume.subtotal)
  })

  it('createEstimateCalculator returns an instance with correct org id', async () => {
    const calculator = createEstimateCalculator('org-xyz')
    ;(calculator as any).pricingData = createPricingData()
    const survey = createSurvey({})

    const result = await calculator.calculateFromSurvey(survey, {
      includeTravel: false,
      includeTesting: false,
      includePermits: false,
    })

    expect(result.total).toBeGreaterThan(0)
  })
})
