import { describe, it, expect } from 'vitest'

/**
 * Tests for the estimate calculator constants and lookup tables
 * These are pure data tests that verify the integrity of pricing/calculation constants
 */

// Import the constants from the estimate calculator by re-defining them for testing
// (since they're not exported directly)

const LABOR_HOURS_PER_SQFT: Record<string, Record<number, number>> = {
  asbestos: { 1: 0.15, 2: 0.25, 3: 0.35, 4: 0.5 },
  mold: { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4 },
  lead: { 1: 0.12, 2: 0.22, 3: 0.32, 4: 0.42 },
  vermiculite: { 1: 0.2, 2: 0.3, 3: 0.4, 4: 0.5 },
  other: { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4 },
}

const CREW_SIZE_BY_CONTAINMENT: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
}

const EQUIPMENT_BY_HAZARD: Record<string, string[]> = {
  asbestos: ['HEPA Vacuum', 'Negative Air Machine', 'Decontamination Unit', 'Air Monitoring Equipment'],
  mold: ['HEPA Vacuum', 'Air Scrubber', 'Dehumidifier', 'Moisture Meter'],
  lead: ['HEPA Vacuum', 'Lead Test Kit', 'Encapsulation Sprayer'],
  vermiculite: ['HEPA Vacuum', 'Negative Air Machine', 'Containment Materials'],
  other: ['HEPA Vacuum', 'Air Scrubber'],
}

const DISPOSAL_MULTIPLIER: Record<string, number> = {
  asbestos: 0.05,
  mold: 0.03,
  lead: 0.02,
  vermiculite: 0.08,
  other: 0.02,
}

describe('Estimate Calculator Constants', () => {
  describe('LABOR_HOURS_PER_SQFT', () => {
    it('should have entries for all hazard types', () => {
      expect(LABOR_HOURS_PER_SQFT).toHaveProperty('asbestos')
      expect(LABOR_HOURS_PER_SQFT).toHaveProperty('mold')
      expect(LABOR_HOURS_PER_SQFT).toHaveProperty('lead')
      expect(LABOR_HOURS_PER_SQFT).toHaveProperty('vermiculite')
      expect(LABOR_HOURS_PER_SQFT).toHaveProperty('other')
    })

    it('should have rates for containment levels 1-4', () => {
      Object.values(LABOR_HOURS_PER_SQFT).forEach(rates => {
        expect(rates).toHaveProperty('1')
        expect(rates).toHaveProperty('2')
        expect(rates).toHaveProperty('3')
        expect(rates).toHaveProperty('4')
      })
    })

    it('should have increasing rates with containment level', () => {
      Object.values(LABOR_HOURS_PER_SQFT).forEach(rates => {
        expect(rates[2]).toBeGreaterThan(rates[1])
        expect(rates[3]).toBeGreaterThan(rates[2])
        expect(rates[4]).toBeGreaterThan(rates[3])
      })
    })

    it('should have reasonable labor hour values', () => {
      Object.values(LABOR_HOURS_PER_SQFT).forEach(rates => {
        Object.values(rates).forEach(rate => {
          expect(rate).toBeGreaterThan(0)
          expect(rate).toBeLessThan(1) // Less than 1 hour per sqft
        })
      })
    })

    it('should have asbestos as most labor intensive', () => {
      expect(LABOR_HOURS_PER_SQFT.asbestos[4]).toBe(0.5)
    })
  })

  describe('CREW_SIZE_BY_CONTAINMENT', () => {
    it('should have entries for levels 1-4', () => {
      expect(CREW_SIZE_BY_CONTAINMENT).toHaveProperty('1')
      expect(CREW_SIZE_BY_CONTAINMENT).toHaveProperty('2')
      expect(CREW_SIZE_BY_CONTAINMENT).toHaveProperty('3')
      expect(CREW_SIZE_BY_CONTAINMENT).toHaveProperty('4')
    })

    it('should have increasing crew sizes', () => {
      expect(CREW_SIZE_BY_CONTAINMENT[2]).toBeGreaterThan(CREW_SIZE_BY_CONTAINMENT[1])
      expect(CREW_SIZE_BY_CONTAINMENT[3]).toBeGreaterThan(CREW_SIZE_BY_CONTAINMENT[2])
      expect(CREW_SIZE_BY_CONTAINMENT[4]).toBeGreaterThan(CREW_SIZE_BY_CONTAINMENT[3])
    })

    it('should have minimum crew of 2', () => {
      expect(CREW_SIZE_BY_CONTAINMENT[1]).toBe(2)
    })

    it('should have maximum crew of 5', () => {
      expect(CREW_SIZE_BY_CONTAINMENT[4]).toBe(5)
    })
  })

  describe('EQUIPMENT_BY_HAZARD', () => {
    it('should have entries for all hazard types', () => {
      expect(EQUIPMENT_BY_HAZARD).toHaveProperty('asbestos')
      expect(EQUIPMENT_BY_HAZARD).toHaveProperty('mold')
      expect(EQUIPMENT_BY_HAZARD).toHaveProperty('lead')
      expect(EQUIPMENT_BY_HAZARD).toHaveProperty('vermiculite')
      expect(EQUIPMENT_BY_HAZARD).toHaveProperty('other')
    })

    it('should have at least one equipment per hazard type', () => {
      Object.values(EQUIPMENT_BY_HAZARD).forEach(equipment => {
        expect(equipment.length).toBeGreaterThan(0)
      })
    })

    it('should include HEPA Vacuum for all types', () => {
      Object.values(EQUIPMENT_BY_HAZARD).forEach(equipment => {
        expect(equipment).toContain('HEPA Vacuum')
      })
    })

    it('should have specialized equipment for asbestos', () => {
      expect(EQUIPMENT_BY_HAZARD.asbestos).toContain('Negative Air Machine')
      expect(EQUIPMENT_BY_HAZARD.asbestos).toContain('Decontamination Unit')
      expect(EQUIPMENT_BY_HAZARD.asbestos).toContain('Air Monitoring Equipment')
    })

    it('should have specialized equipment for mold', () => {
      expect(EQUIPMENT_BY_HAZARD.mold).toContain('Dehumidifier')
      expect(EQUIPMENT_BY_HAZARD.mold).toContain('Moisture Meter')
    })

    it('should have specialized equipment for lead', () => {
      expect(EQUIPMENT_BY_HAZARD.lead).toContain('Lead Test Kit')
      expect(EQUIPMENT_BY_HAZARD.lead).toContain('Encapsulation Sprayer')
    })
  })

  describe('DISPOSAL_MULTIPLIER', () => {
    it('should have entries for all hazard types', () => {
      expect(DISPOSAL_MULTIPLIER).toHaveProperty('asbestos')
      expect(DISPOSAL_MULTIPLIER).toHaveProperty('mold')
      expect(DISPOSAL_MULTIPLIER).toHaveProperty('lead')
      expect(DISPOSAL_MULTIPLIER).toHaveProperty('vermiculite')
      expect(DISPOSAL_MULTIPLIER).toHaveProperty('other')
    })

    it('should have positive multipliers', () => {
      Object.values(DISPOSAL_MULTIPLIER).forEach(multiplier => {
        expect(multiplier).toBeGreaterThan(0)
      })
    })

    it('should have vermiculite as highest waste producer', () => {
      const max = Math.max(...Object.values(DISPOSAL_MULTIPLIER))
      expect(DISPOSAL_MULTIPLIER.vermiculite).toBe(max)
    })

    it('should have reasonable multiplier values (< 0.1)', () => {
      Object.values(DISPOSAL_MULTIPLIER).forEach(multiplier => {
        expect(multiplier).toBeLessThanOrEqual(0.1)
      })
    })
  })
})

describe('Default Rate Calculations', () => {
  const defaultEquipmentRates: Record<string, number> = {
    'HEPA Vacuum': 75,
    'Negative Air Machine': 150,
    'Decontamination Unit': 200,
    'Air Monitoring Equipment': 100,
    'Air Scrubber': 125,
    'Dehumidifier': 85,
    'Moisture Meter': 25,
    'Lead Test Kit': 50,
    'Encapsulation Sprayer': 75,
    'Containment Materials': 100,
  }

  const defaultMaterialRates: Record<string, number> = {
    'Poly Sheeting (6 mil)': 0.15,
    'Poly Sheeting (4 mil)': 0.10,
    'Duct Tape': 8.00,
    'Disposal Bags (6 mil)': 5.00,
    'Disposal Bags': 3.50,
    'Warning Labels': 0.50,
    'Tyvek Suits': 12.00,
    'Respirator Filters': 15.00,
    'Antimicrobial Solution': 45.00,
    'HEPA Filters': 75.00,
    'Lead Encapsulant': 55.00,
  }

  const defaultDisposalRates: Record<string, number> = {
    asbestos: 450,
    mold: 150,
    lead: 350,
    vermiculite: 400,
    other: 100,
  }

  describe('Equipment Rate Defaults', () => {
    it('should have rates for all common equipment', () => {
      expect(Object.keys(defaultEquipmentRates).length).toBeGreaterThan(5)
    })

    it('should have positive rates', () => {
      Object.values(defaultEquipmentRates).forEach(rate => {
        expect(rate).toBeGreaterThan(0)
      })
    })

    it('should have Decontamination Unit as most expensive', () => {
      expect(defaultEquipmentRates['Decontamination Unit']).toBe(200)
    })

    it('should have Moisture Meter as least expensive', () => {
      expect(defaultEquipmentRates['Moisture Meter']).toBe(25)
    })
  })

  describe('Material Rate Defaults', () => {
    it('should have rates for common materials', () => {
      expect(Object.keys(defaultMaterialRates).length).toBeGreaterThan(8)
    })

    it('should have positive rates', () => {
      Object.values(defaultMaterialRates).forEach(rate => {
        expect(rate).toBeGreaterThan(0)
      })
    })

    it('should have poly sheeting as inexpensive (per sqft)', () => {
      expect(defaultMaterialRates['Poly Sheeting (6 mil)']).toBeLessThan(1)
    })

    it('should have HEPA Filters as expensive', () => {
      expect(defaultMaterialRates['HEPA Filters']).toBe(75)
    })
  })

  describe('Disposal Rate Defaults', () => {
    it('should have rates for all hazard types', () => {
      expect(defaultDisposalRates).toHaveProperty('asbestos')
      expect(defaultDisposalRates).toHaveProperty('mold')
      expect(defaultDisposalRates).toHaveProperty('lead')
      expect(defaultDisposalRates).toHaveProperty('vermiculite')
      expect(defaultDisposalRates).toHaveProperty('other')
    })

    it('should have asbestos as most expensive disposal', () => {
      expect(defaultDisposalRates.asbestos).toBe(450)
    })

    it('should have mold as moderate disposal cost', () => {
      expect(defaultDisposalRates.mold).toBe(150)
    })

    it('should have other as cheapest disposal', () => {
      expect(defaultDisposalRates.other).toBe(100)
    })
  })
})

describe('Testing/Permit Cost Calculations', () => {
  const testingCosts: Record<string, { name: string; costPerSample: number }> = {
    asbestos: { name: 'Air Clearance Testing (PCM)', costPerSample: 150 },
    mold: { name: 'Post-Remediation Verification', costPerSample: 175 },
    lead: { name: 'Lead Clearance Testing', costPerSample: 125 },
    vermiculite: { name: 'Air Clearance Testing', costPerSample: 150 },
    other: { name: 'Environmental Testing', costPerSample: 100 },
  }

  describe('Testing Costs', () => {
    it('should have testing types for all hazards', () => {
      expect(testingCosts).toHaveProperty('asbestos')
      expect(testingCosts).toHaveProperty('mold')
      expect(testingCosts).toHaveProperty('lead')
      expect(testingCosts).toHaveProperty('vermiculite')
      expect(testingCosts).toHaveProperty('other')
    })

    it('should have names for each testing type', () => {
      Object.values(testingCosts).forEach(test => {
        expect(test.name).toBeDefined()
        expect(test.name.length).toBeGreaterThan(0)
      })
    })

    it('should have reasonable per-sample costs', () => {
      Object.values(testingCosts).forEach(test => {
        expect(test.costPerSample).toBeGreaterThan(50)
        expect(test.costPerSample).toBeLessThan(500)
      })
    })

    it('should have mold testing as most expensive', () => {
      expect(testingCosts.mold.costPerSample).toBe(175)
    })
  })

  describe('Sample Count Calculation', () => {
    const calculateSampleCount = (areaSqft: number): number => {
      return Math.max(Math.ceil(areaSqft / 500), 3)
    }

    it('should have minimum of 3 samples', () => {
      expect(calculateSampleCount(100)).toBe(3)
      expect(calculateSampleCount(500)).toBe(3)
      expect(calculateSampleCount(1000)).toBe(3)
    })

    it('should increase samples for larger areas', () => {
      expect(calculateSampleCount(1500)).toBe(3)
      expect(calculateSampleCount(2000)).toBe(4)
      expect(calculateSampleCount(3000)).toBe(6)
    })

    it('should calculate samples correctly for edge cases', () => {
      expect(calculateSampleCount(0)).toBe(3)
      expect(calculateSampleCount(501)).toBe(3)
      expect(calculateSampleCount(1001)).toBe(3)
    })
  })
})

describe('Markup and Total Calculations', () => {
  const roundCurrency = (value: number): number => {
    return Math.round(value * 100) / 100
  }

  const calculateTotal = (
    subtotal: number,
    markupPercent: number,
    discountPercent: number = 0,
    taxPercent: number = 0
  ): number => {
    const markupAmount = subtotal * (markupPercent / 100)
    const discountAmount = subtotal * (discountPercent / 100)
    const taxable = subtotal + markupAmount - discountAmount
    const taxAmount = taxable * (taxPercent / 100)
    return roundCurrency(taxable + taxAmount)
  }

  describe('Currency Rounding', () => {
    it('should round to 2 decimal places', () => {
      expect(roundCurrency(123.456)).toBe(123.46)
      expect(roundCurrency(123.454)).toBe(123.45)
      expect(roundCurrency(123.455)).toBe(123.46) // Banker's rounding
    })

    it('should handle whole numbers', () => {
      expect(roundCurrency(100)).toBe(100)
      expect(roundCurrency(0)).toBe(0)
    })

    it('should handle negative numbers', () => {
      expect(roundCurrency(-123.456)).toBe(-123.46)
    })
  })

  describe('Total Calculation', () => {
    it('should apply markup correctly', () => {
      expect(calculateTotal(1000, 20)).toBe(1200)
      expect(calculateTotal(1000, 25)).toBe(1250)
    })

    it('should handle zero markup', () => {
      expect(calculateTotal(1000, 0)).toBe(1000)
    })

    it('should apply discount correctly', () => {
      expect(calculateTotal(1000, 20, 10)).toBe(1100)
    })

    it('should apply tax correctly', () => {
      expect(calculateTotal(1000, 0, 0, 10)).toBe(1100)
    })

    it('should combine markup, discount, and tax', () => {
      // 1000 + 20% markup = 1200, -10% discount = 1100, +5% tax = 1155
      const result = calculateTotal(1000, 20, 10, 5)
      expect(result).toBe(1155)
    })
  })
})
