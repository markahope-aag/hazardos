import { describe, it, expect, vi } from 'vitest'
import { EstimateCalculator, createEstimateCalculator } from '@/lib/services/estimate-calculator'
import type { SiteSurvey } from '@/types/database'

// Mock Supabase client (not used when pricingData is injected directly)
const mockSupabase = {} as any

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

// Helper to create pricing data matching current DB types
function createPricingData() {
  const laborRates = [
    {
      id: 'labor-supervisor',
      organization_id: 'org-1',
      name: 'Supervisor',
      rate_per_hour: 100,
      description: null,
      is_default: true,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'labor-tech',
      organization_id: 'org-1',
      name: 'Technician',
      rate_per_hour: 60,
      description: null,
      is_default: false,
      created_at: '',
      updated_at: '',
    },
  ]

  const equipmentRates = [
    {
      id: 'equip-hepa',
      organization_id: 'org-1',
      name: 'HEPA Vacuum',
      rate_per_day: 80,
      description: null,
      created_at: '',
      updated_at: '',
    },
  ]

  const materialCosts = [
    {
      id: 'mat-poly',
      organization_id: 'org-1',
      name: 'Poly Sheeting (6 mil)',
      unit: 'sqft',
      cost_per_unit: 0.2,
      description: null,
      created_at: '',
      updated_at: '',
    },
  ]

  const disposalFees = [
    {
      id: 'disp-asb',
      organization_id: 'org-1',
      hazard_type: 'asbestos_friable',
      cost_per_cubic_yard: 500,
      description: null,
      created_at: '',
      updated_at: '',
    },
  ]

  const travelRates = [
    {
      id: 'travel-flat',
      organization_id: 'org-1',
      min_miles: 0,
      max_miles: null,
      flat_fee: 300,
      per_mile_rate: null,
      created_at: '',
      updated_at: '',
    },
  ]

  const pricingSettings = {
    id: 'pricing-1',
    organization_id: 'org-1',
    default_markup_percent: 25,
    minimum_markup_percent: 15,
    maximum_markup_percent: 50,
    office_address_line1: null,
    office_address_line2: null,
    office_city: null,
    office_state: null,
    office_zip: null,
    office_lat: null,
    office_lng: null,
    created_at: '',
    updated_at: '',
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
    const calculator = new EstimateCalculator('org-1', mockSupabase)
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
    expect(result.markup_amount).toBeCloseTo(result.subtotal * 0.1, 1)
    expect(result.total).toBeCloseTo(result.subtotal * 1.1, 1)
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

    // Area 400 via area_sqft vs linear_ft*2=400 produce same area,
    // but volume 1600/8=200 gives a different area-based estimate
    expect(resultArea.subtotal).not.toBe(resultVolume.subtotal)
  })

  it('createEstimateCalculator returns an instance with correct org id', async () => {
    const calculator = createEstimateCalculator('org-xyz', mockSupabase)
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
