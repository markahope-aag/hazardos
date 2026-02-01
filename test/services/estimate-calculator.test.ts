import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EstimateCalculator } from '@/lib/services/estimate-calculator'
import type { SiteSurvey } from '@/types/database'

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  })
}))

describe('EstimateCalculator', () => {
  let calculator: EstimateCalculator

  beforeEach(() => {
    calculator = new EstimateCalculator('org-123')
  })

  describe('constructor', () => {
    it('should create instance with organization id', () => {
      const calc = new EstimateCalculator('org-456')
      expect(calc).toBeInstanceOf(EstimateCalculator)
    })
  })

  describe('calculateFromSurvey', () => {
    const baseSurvey: Partial<SiteSurvey> = {
      id: 'survey-1',
      organization_id: 'org-123',
      hazard_type: 'asbestos',
      area_sqft: 500,
      containment_level: 2,
      clearance_required: true,
      regulatory_notifications_needed: true
    }

    it('should calculate estimate with default options', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey)

      expect(result).toHaveProperty('line_items')
      expect(result).toHaveProperty('subtotal')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('markup_percent')
      expect(result).toHaveProperty('markup_amount')
      expect(Array.isArray(result.line_items)).toBe(true)
    })

    it('should include labor line items', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey)

      const laborItems = result.line_items.filter(item => item.item_type === 'labor')
      expect(laborItems.length).toBeGreaterThan(0)
    })

    it('should include equipment line items', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey)

      const equipmentItems = result.line_items.filter(item => item.item_type === 'equipment')
      expect(equipmentItems.length).toBeGreaterThan(0)
    })

    it('should include material line items', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey)

      const materialItems = result.line_items.filter(item => item.item_type === 'material')
      expect(materialItems.length).toBeGreaterThan(0)
    })

    it('should include disposal line items', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey)

      const disposalItems = result.line_items.filter(item => item.item_type === 'disposal')
      expect(disposalItems.length).toBeGreaterThan(0)
    })

    it('should include travel when option is true', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey, {
        includeTravel: true
      })

      const travelItems = result.line_items.filter(item => item.item_type === 'travel')
      expect(travelItems.length).toBeGreaterThan(0)
    })

    it('should exclude travel when option is false', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey, {
        includeTravel: false
      })

      const travelItems = result.line_items.filter(item => item.item_type === 'travel')
      expect(travelItems.length).toBe(0)
    })

    it('should include testing when clearance is required', async () => {
      const result = await calculator.calculateFromSurvey({
        ...baseSurvey,
        clearance_required: true
      } as SiteSurvey, {
        includeTesting: true
      })

      const testingItems = result.line_items.filter(item => item.item_type === 'testing')
      expect(testingItems.length).toBeGreaterThan(0)
    })

    it('should exclude testing when option is false', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey, {
        includeTesting: false
      })

      const testingItems = result.line_items.filter(item => item.item_type === 'testing')
      expect(testingItems.length).toBe(0)
    })

    it('should include permits when regulatory notifications needed', async () => {
      const result = await calculator.calculateFromSurvey({
        ...baseSurvey,
        regulatory_notifications_needed: true
      } as SiteSurvey, {
        includePermits: true
      })

      const permitItems = result.line_items.filter(item => item.item_type === 'permit')
      expect(permitItems.length).toBeGreaterThan(0)
    })

    it('should exclude permits when option is false', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey, {
        includePermits: false
      })

      const permitItems = result.line_items.filter(item => item.item_type === 'permit')
      expect(permitItems.length).toBe(0)
    })

    it('should use custom markup when provided', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey, {
        customMarkup: 25
      })

      expect(result.markup_percent).toBe(25)
    })

    it('should use default markup of 20% when not provided', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey)

      expect(result.markup_percent).toBe(20)
    })

    it('should calculate total correctly', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey)

      const expectedTotal = result.subtotal + result.markup_amount - result.discount_amount + result.tax_amount
      expect(result.total).toBeCloseTo(expectedTotal, 2)
    })

    it('should round currency values to 2 decimal places', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey)

      expect(result.subtotal).toBe(Math.round(result.subtotal * 100) / 100)
      expect(result.total).toBe(Math.round(result.total * 100) / 100)
    })

    it('should handle different hazard types', async () => {
      const hazardTypes = ['asbestos', 'mold', 'lead', 'vermiculite', 'other'] as const

      for (const hazardType of hazardTypes) {
        const result = await calculator.calculateFromSurvey({
          ...baseSurvey,
          hazard_type: hazardType
        } as SiteSurvey)

        expect(result.line_items.length).toBeGreaterThan(0)
        expect(result.total).toBeGreaterThan(0)
      }
    })

    it('should handle different containment levels', async () => {
      const containmentLevels = [1, 2, 3, 4] as const

      for (const level of containmentLevels) {
        const result = await calculator.calculateFromSurvey({
          ...baseSurvey,
          containment_level: level
        } as SiteSurvey)

        expect(result.line_items.length).toBeGreaterThan(0)
      }
    })

    it('should calculate area from linear_ft when area_sqft is missing', async () => {
      const result = await calculator.calculateFromSurvey({
        ...baseSurvey,
        area_sqft: null,
        linear_ft: 100
      } as SiteSurvey)

      expect(result.line_items.length).toBeGreaterThan(0)
      expect(result.subtotal).toBeGreaterThan(0)
    })

    it('should calculate area from volume_cuft when area_sqft and linear_ft are missing', async () => {
      const result = await calculator.calculateFromSurvey({
        ...baseSurvey,
        area_sqft: null,
        linear_ft: null,
        volume_cuft: 800
      } as SiteSurvey)

      expect(result.line_items.length).toBeGreaterThan(0)
      expect(result.subtotal).toBeGreaterThan(0)
    })

    it('should use minimum area when no measurements provided', async () => {
      const result = await calculator.calculateFromSurvey({
        ...baseSurvey,
        area_sqft: null,
        linear_ft: null,
        volume_cuft: null
      } as SiteSurvey)

      expect(result.line_items.length).toBeGreaterThan(0)
    })

    it('should mark line items as included by default', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey)

      const includedItems = result.line_items.filter(item => item.is_included)
      expect(includedItems.length).toBe(result.line_items.length)
    })

    it('should set discount to zero by default', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey)

      expect(result.discount_percent).toBe(0)
      expect(result.discount_amount).toBe(0)
    })

    it('should set tax to zero by default', async () => {
      const result = await calculator.calculateFromSurvey(baseSurvey as SiteSurvey)

      expect(result.tax_percent).toBe(0)
      expect(result.tax_amount).toBe(0)
    })
  })
})
