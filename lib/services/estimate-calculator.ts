import { createClient } from '@/lib/supabase/client'
import type { SiteSurvey, LaborRate, EquipmentRate, MaterialCost, DisposalFee, TravelRate, PricingSetting } from '@/types/database'
import type { CalculatedLineItem, EstimateCalculation, LineItemType } from '@/types/estimates'

// ============================================================================
// Types for Pricing Data
// ============================================================================

interface PricingData {
  laborRates: LaborRate[]
  equipmentRates: EquipmentRate[]
  materialCosts: MaterialCost[]
  disposalFees: DisposalFee[]
  travelRates: TravelRate[]
  pricingSettings: PricingSetting | null
}

interface CalculatorOptions {
  includeTravel?: boolean
  includeTesting?: boolean
  includePermits?: boolean
  customMarkup?: number
}

// ============================================================================
// Constants for Calculation
// ============================================================================

// Labor hours per square foot by hazard type and containment level
const LABOR_HOURS_PER_SQFT: Record<string, Record<number, number>> = {
  asbestos: { 1: 0.15, 2: 0.25, 3: 0.35, 4: 0.5 },
  mold: { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4 },
  lead: { 1: 0.12, 2: 0.22, 3: 0.32, 4: 0.42 },
  vermiculite: { 1: 0.2, 2: 0.3, 3: 0.4, 4: 0.5 },
  other: { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4 },
}

// Crew size by containment level
const CREW_SIZE_BY_CONTAINMENT: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
}

// Equipment needs by hazard type
const EQUIPMENT_BY_HAZARD: Record<string, string[]> = {
  asbestos: ['HEPA Vacuum', 'Negative Air Machine', 'Decontamination Unit', 'Air Monitoring Equipment'],
  mold: ['HEPA Vacuum', 'Air Scrubber', 'Dehumidifier', 'Moisture Meter'],
  lead: ['HEPA Vacuum', 'Lead Test Kit', 'Encapsulation Sprayer'],
  vermiculite: ['HEPA Vacuum', 'Negative Air Machine', 'Containment Materials'],
  other: ['HEPA Vacuum', 'Air Scrubber'],
}

// Material requirements by hazard type (per sqft)
const MATERIALS_BY_HAZARD: Record<string, { name: string; qtyPerSqft: number; unit: string }[]> = {
  asbestos: [
    { name: 'Poly Sheeting (6 mil)', qtyPerSqft: 1.5, unit: 'sqft' },
    { name: 'Duct Tape', qtyPerSqft: 0.1, unit: 'roll' },
    { name: 'Disposal Bags (6 mil)', qtyPerSqft: 0.02, unit: 'each' },
    { name: 'Warning Labels', qtyPerSqft: 0.01, unit: 'each' },
    { name: 'Tyvek Suits', qtyPerSqft: 0.005, unit: 'each' },
    { name: 'Respirator Filters', qtyPerSqft: 0.01, unit: 'pair' },
  ],
  mold: [
    { name: 'Poly Sheeting (6 mil)', qtyPerSqft: 1.2, unit: 'sqft' },
    { name: 'Antimicrobial Solution', qtyPerSqft: 0.05, unit: 'gallon' },
    { name: 'HEPA Filters', qtyPerSqft: 0.001, unit: 'each' },
    { name: 'Tyvek Suits', qtyPerSqft: 0.003, unit: 'each' },
  ],
  lead: [
    { name: 'Poly Sheeting (6 mil)', qtyPerSqft: 1.0, unit: 'sqft' },
    { name: 'Lead Encapsulant', qtyPerSqft: 0.02, unit: 'gallon' },
    { name: 'Disposal Bags', qtyPerSqft: 0.015, unit: 'each' },
    { name: 'Tyvek Suits', qtyPerSqft: 0.004, unit: 'each' },
  ],
  vermiculite: [
    { name: 'Poly Sheeting (6 mil)', qtyPerSqft: 1.5, unit: 'sqft' },
    { name: 'Disposal Bags (6 mil)', qtyPerSqft: 0.03, unit: 'each' },
    { name: 'Warning Labels', qtyPerSqft: 0.01, unit: 'each' },
  ],
  other: [
    { name: 'Poly Sheeting (4 mil)', qtyPerSqft: 1.0, unit: 'sqft' },
    { name: 'Disposal Bags', qtyPerSqft: 0.01, unit: 'each' },
  ],
}

// Disposal volume multiplier (waste volume per sqft)
const DISPOSAL_MULTIPLIER: Record<string, number> = {
  asbestos: 0.05, // cubic yards per sqft
  mold: 0.03,
  lead: 0.02,
  vermiculite: 0.08,
  other: 0.02,
}

// ============================================================================
// Main Calculator Class
// ============================================================================

export class EstimateCalculator {
  private organizationId: string
  private pricingData: PricingData | null = null

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  /**
   * Load all pricing data for the organization
   */
  async loadPricingData(): Promise<void> {
    const supabase = createClient()

    const [laborRes, equipmentRes, materialRes, disposalRes, travelRes, settingsRes] = await Promise.all([
      supabase.from('labor_rates').select('*').eq('organization_id', this.organizationId).eq('is_active', true),
      supabase.from('equipment_rates').select('*').eq('organization_id', this.organizationId).eq('is_active', true),
      supabase.from('material_costs').select('*').eq('organization_id', this.organizationId).eq('is_active', true),
      supabase.from('disposal_fees').select('*').eq('organization_id', this.organizationId).eq('is_active', true),
      supabase.from('travel_rates').select('*').eq('organization_id', this.organizationId).eq('is_active', true),
      supabase.from('pricing_settings').select('*').eq('organization_id', this.organizationId).single(),
    ])

    this.pricingData = {
      laborRates: (laborRes.data || []) as LaborRate[],
      equipmentRates: (equipmentRes.data || []) as EquipmentRate[],
      materialCosts: (materialRes.data || []) as MaterialCost[],
      disposalFees: (disposalRes.data || []) as DisposalFee[],
      travelRates: (travelRes.data || []) as TravelRate[],
      pricingSettings: settingsRes.data as PricingSetting | null,
    }
  }

  /**
   * Calculate estimate from a site survey
   */
  async calculateFromSurvey(
    survey: SiteSurvey,
    options: CalculatorOptions = {}
  ): Promise<EstimateCalculation> {
    // Load pricing data if not already loaded
    if (!this.pricingData) {
      await this.loadPricingData()
    }

    const lineItems: CalculatedLineItem[] = []
    let sortOrder = 0

    // Calculate area (use sqft, or estimate from linear ft or volume)
    const areaSqft = this.calculateArea(survey)
    const containmentLevel = survey.containment_level || 1
    const hazardType = survey.hazard_type || 'other'

    // 1. Calculate Labor
    const laborItems = this.calculateLabor(hazardType, areaSqft, containmentLevel, sortOrder)
    lineItems.push(...laborItems)
    sortOrder += laborItems.length

    // 2. Calculate Equipment
    const equipmentItems = this.calculateEquipment(hazardType, containmentLevel, sortOrder)
    lineItems.push(...equipmentItems)
    sortOrder += equipmentItems.length

    // 3. Calculate Materials
    const materialItems = this.calculateMaterials(hazardType, areaSqft, sortOrder)
    lineItems.push(...materialItems)
    sortOrder += materialItems.length

    // 4. Calculate Disposal
    const disposalItems = this.calculateDisposal(hazardType, areaSqft, survey.volume_cuft, sortOrder)
    lineItems.push(...disposalItems)
    sortOrder += disposalItems.length

    // 5. Calculate Travel (optional)
    if (options.includeTravel !== false) {
      const travelItems = this.calculateTravel(sortOrder)
      lineItems.push(...travelItems)
      sortOrder += travelItems.length
    }

    // 6. Calculate Testing/Clearance (if required)
    if (options.includeTesting !== false && survey.clearance_required) {
      const testingItems = this.calculateTesting(hazardType, areaSqft, sortOrder)
      lineItems.push(...testingItems)
      sortOrder += testingItems.length
    }

    // 7. Calculate Permits (if regulatory notifications needed)
    if (options.includePermits !== false && survey.regulatory_notifications_needed) {
      const permitItems = this.calculatePermits(hazardType, sortOrder)
      lineItems.push(...permitItems)
    }

    // Calculate totals
    const subtotal = lineItems
      .filter(item => item.is_included)
      .reduce((sum, item) => sum + item.total_price, 0)

    const markupPercent = options.customMarkup ??
      this.pricingData?.pricingSettings?.default_markup_percentage ?? 20
    const markupAmount = subtotal * (markupPercent / 100)

    // No discount by default
    const discountPercent = 0
    const discountAmount = 0

    // No tax by default (varies by jurisdiction)
    const taxPercent = 0
    const taxAmount = 0

    const total = subtotal + markupAmount - discountAmount + taxAmount

    return {
      line_items: lineItems,
      subtotal: this.roundCurrency(subtotal),
      markup_percent: markupPercent,
      markup_amount: this.roundCurrency(markupAmount),
      discount_percent: discountPercent,
      discount_amount: this.roundCurrency(discountAmount),
      tax_percent: taxPercent,
      tax_amount: this.roundCurrency(taxAmount),
      total: this.roundCurrency(total),
    }
  }

  // ============================================================================
  // Private Calculation Methods
  // ============================================================================

  private calculateArea(survey: SiteSurvey): number {
    if (survey.area_sqft && survey.area_sqft > 0) {
      return survey.area_sqft
    }
    // Estimate from linear feet (assume 2ft width for pipe/duct work)
    if (survey.linear_ft && survey.linear_ft > 0) {
      return survey.linear_ft * 2
    }
    // Estimate from volume (assume 8ft ceiling)
    if (survey.volume_cuft && survey.volume_cuft > 0) {
      return survey.volume_cuft / 8
    }
    return 100 // Default minimum area
  }

  private calculateLabor(
    hazardType: string,
    areaSqft: number,
    containmentLevel: number,
    startOrder: number
  ): CalculatedLineItem[] {
    const items: CalculatedLineItem[] = []
    const hoursPerSqft = LABOR_HOURS_PER_SQFT[hazardType]?.[containmentLevel] || 0.2
    const crewSize = CREW_SIZE_BY_CONTAINMENT[containmentLevel] || 2
    const totalHours = areaSqft * hoursPerSqft

    // Find labor rates from pricing data
    const supervisorRate = this.pricingData?.laborRates.find(r =>
      r.role_title.toLowerCase().includes('supervisor')
    )
    const technicianRate = this.pricingData?.laborRates.find(r =>
      r.role_title.toLowerCase().includes('technician') ||
      r.role_title.toLowerCase().includes('worker')
    )

    // Default rates if not found
    const defaultSupervisorRate = 85
    const defaultTechnicianRate = 55

    // Supervisor labor (1 supervisor, full hours)
    const supervisorHours = totalHours
    const supervisorUnitPrice = supervisorRate?.hourly_rate || defaultSupervisorRate
    items.push({
      item_type: 'labor',
      category: 'Supervisor',
      description: 'Project Supervisor',
      quantity: this.roundQuantity(supervisorHours),
      unit: 'hour',
      unit_price: supervisorUnitPrice,
      total_price: this.roundCurrency(supervisorHours * supervisorUnitPrice),
      source_rate_id: supervisorRate?.id,
      source_table: 'labor_rates',
      is_optional: false,
      is_included: true,
    })

    // Technician labor (crew size - 1, full hours)
    const techCount = Math.max(crewSize - 1, 1)
    const technicianHours = totalHours * techCount
    const technicianUnitPrice = technicianRate?.hourly_rate || defaultTechnicianRate
    items.push({
      item_type: 'labor',
      category: 'Technician',
      description: `Abatement Technicians (${techCount})`,
      quantity: this.roundQuantity(technicianHours),
      unit: 'hour',
      unit_price: technicianUnitPrice,
      total_price: this.roundCurrency(technicianHours * technicianUnitPrice),
      source_rate_id: technicianRate?.id,
      source_table: 'labor_rates',
      is_optional: false,
      is_included: true,
    })

    return items.map((item, idx) => ({ ...item, sort_order: startOrder + idx } as CalculatedLineItem))
  }

  private calculateEquipment(
    hazardType: string,
    containmentLevel: number,
    startOrder: number
  ): CalculatedLineItem[] {
    const items: CalculatedLineItem[] = []
    const neededEquipment = EQUIPMENT_BY_HAZARD[hazardType] || EQUIPMENT_BY_HAZARD.other

    // Estimate days based on containment level
    const estimatedDays = Math.max(containmentLevel, 2)

    for (const equipmentName of neededEquipment) {
      // Find matching equipment rate
      const rate = this.pricingData?.equipmentRates.find(r =>
        r.equipment_name.toLowerCase().includes(equipmentName.toLowerCase()) ||
        equipmentName.toLowerCase().includes(r.equipment_name.toLowerCase())
      )

      const dailyRate = rate?.daily_rate || this.getDefaultEquipmentRate(equipmentName)

      items.push({
        item_type: 'equipment',
        category: 'Equipment Rental',
        description: equipmentName,
        quantity: estimatedDays,
        unit: 'day',
        unit_price: dailyRate,
        total_price: this.roundCurrency(estimatedDays * dailyRate),
        source_rate_id: rate?.id,
        source_table: 'equipment_rates',
        is_optional: false,
        is_included: true,
      })
    }

    return items.map((item, idx) => ({ ...item, sort_order: startOrder + idx } as CalculatedLineItem))
  }

  private calculateMaterials(
    hazardType: string,
    areaSqft: number,
    startOrder: number
  ): CalculatedLineItem[] {
    const items: CalculatedLineItem[] = []
    const materialList = MATERIALS_BY_HAZARD[hazardType] || MATERIALS_BY_HAZARD.other

    for (const material of materialList) {
      const quantity = areaSqft * material.qtyPerSqft

      // Find matching material cost
      const cost = this.pricingData?.materialCosts.find(m =>
        m.material_name.toLowerCase().includes(material.name.toLowerCase()) ||
        material.name.toLowerCase().includes(m.material_name.toLowerCase())
      )

      const unitPrice = cost?.unit_cost || this.getDefaultMaterialRate(material.name)

      items.push({
        item_type: 'material',
        category: 'Materials',
        description: material.name,
        quantity: this.roundQuantity(quantity),
        unit: material.unit,
        unit_price: unitPrice,
        total_price: this.roundCurrency(quantity * unitPrice),
        source_rate_id: cost?.id,
        source_table: 'material_costs',
        is_optional: false,
        is_included: true,
      })
    }

    return items.map((item, idx) => ({ ...item, sort_order: startOrder + idx } as CalculatedLineItem))
  }

  private calculateDisposal(
    hazardType: string,
    areaSqft: number,
    volumeCuft: number | null,
    startOrder: number
  ): CalculatedLineItem[] {
    const items: CalculatedLineItem[] = []

    // Calculate waste volume (cubic yards)
    let wasteVolumeCuYd: number
    if (volumeCuft && volumeCuft > 0) {
      wasteVolumeCuYd = volumeCuft / 27 // Convert cubic feet to cubic yards
    } else {
      const multiplier = DISPOSAL_MULTIPLIER[hazardType] || 0.02
      wasteVolumeCuYd = areaSqft * multiplier
    }

    // Map hazard type to disposal hazard type
    const disposalHazardType = this.mapToDisposalHazardType(hazardType)

    // Find matching disposal fee
    const fee = this.pricingData?.disposalFees.find(f =>
      f.hazard_type === disposalHazardType
    )

    const unitPrice = fee?.unit_cost || this.getDefaultDisposalRate(hazardType)

    items.push({
      item_type: 'disposal',
      category: 'Waste Disposal',
      description: `${hazardType.charAt(0).toUpperCase() + hazardType.slice(1)} Waste Disposal`,
      quantity: this.roundQuantity(wasteVolumeCuYd),
      unit: 'cubic yard',
      unit_price: unitPrice,
      total_price: this.roundCurrency(wasteVolumeCuYd * unitPrice),
      source_rate_id: fee?.id,
      source_table: 'disposal_fees',
      is_optional: false,
      is_included: true,
    })

    return items.map((item, idx) => ({ ...item, sort_order: startOrder + idx } as CalculatedLineItem))
  }

  private calculateTravel(startOrder: number): CalculatedLineItem[] {
    const items: CalculatedLineItem[] = []

    // Find travel rate
    const rate = this.pricingData?.travelRates.find(r => r.is_active)

    if (rate?.flat_fee) {
      items.push({
        item_type: 'travel',
        category: 'Travel',
        description: 'Travel/Mobilization',
        quantity: 1,
        unit: 'trip',
        unit_price: rate.flat_fee,
        total_price: rate.flat_fee,
        source_rate_id: rate.id,
        source_table: 'travel_rates',
        is_optional: true,
        is_included: true,
      })
    } else {
      // Default travel fee
      items.push({
        item_type: 'travel',
        category: 'Travel',
        description: 'Travel/Mobilization',
        quantity: 1,
        unit: 'trip',
        unit_price: 250,
        total_price: 250,
        is_optional: true,
        is_included: true,
      })
    }

    return items.map((item, idx) => ({ ...item, sort_order: startOrder + idx } as CalculatedLineItem))
  }

  private calculateTesting(
    hazardType: string,
    areaSqft: number,
    startOrder: number
  ): CalculatedLineItem[] {
    const items: CalculatedLineItem[] = []

    // Number of clearance samples based on area
    const sampleCount = Math.max(Math.ceil(areaSqft / 500), 3)

    // Testing costs vary by hazard type
    const testingCosts: Record<string, { name: string; costPerSample: number }> = {
      asbestos: { name: 'Air Clearance Testing (PCM)', costPerSample: 150 },
      mold: { name: 'Post-Remediation Verification', costPerSample: 175 },
      lead: { name: 'Lead Clearance Testing', costPerSample: 125 },
      vermiculite: { name: 'Air Clearance Testing', costPerSample: 150 },
      other: { name: 'Environmental Testing', costPerSample: 100 },
    }

    const testing = testingCosts[hazardType] || testingCosts.other

    items.push({
      item_type: 'testing',
      category: 'Testing',
      description: testing.name,
      quantity: sampleCount,
      unit: 'sample',
      unit_price: testing.costPerSample,
      total_price: this.roundCurrency(sampleCount * testing.costPerSample),
      is_optional: true,
      is_included: true,
    })

    return items.map((item, idx) => ({ ...item, sort_order: startOrder + idx } as CalculatedLineItem))
  }

  private calculatePermits(hazardType: string, startOrder: number): CalculatedLineItem[] {
    const items: CalculatedLineItem[] = []

    // Permit costs by hazard type
    const permitCosts: Record<string, { name: string; cost: number }[]> = {
      asbestos: [
        { name: 'EPA Notification', cost: 350 },
        { name: 'State Permit Fee', cost: 250 },
      ],
      mold: [
        { name: 'Local Permit', cost: 150 },
      ],
      lead: [
        { name: 'EPA RRP Notification', cost: 200 },
        { name: 'State Permit Fee', cost: 175 },
      ],
      vermiculite: [
        { name: 'EPA Notification', cost: 350 },
      ],
      other: [
        { name: 'General Permit', cost: 100 },
      ],
    }

    const permits = permitCosts[hazardType] || permitCosts.other

    for (const permit of permits) {
      items.push({
        item_type: 'permit',
        category: 'Permits & Fees',
        description: permit.name,
        quantity: 1,
        unit: 'each',
        unit_price: permit.cost,
        total_price: permit.cost,
        is_optional: true,
        is_included: true,
      })
    }

    return items.map((item, idx) => ({ ...item, sort_order: startOrder + idx } as CalculatedLineItem))
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapToDisposalHazardType(hazardType: string): string {
    const mapping: Record<string, string> = {
      asbestos: 'asbestos_friable',
      mold: 'mold',
      lead: 'lead',
      vermiculite: 'asbestos_non_friable',
      other: 'other',
    }
    return mapping[hazardType] || 'other'
  }

  private getDefaultEquipmentRate(name: string): number {
    const defaults: Record<string, number> = {
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
    return defaults[name] || 100
  }

  private getDefaultMaterialRate(name: string): number {
    const defaults: Record<string, number> = {
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
    return defaults[name] || 10.00
  }

  private getDefaultDisposalRate(hazardType: string): number {
    const defaults: Record<string, number> = {
      asbestos: 450,
      mold: 150,
      lead: 350,
      vermiculite: 400,
      other: 100,
    }
    return defaults[hazardType] || 150
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100
  }

  private roundQuantity(value: number): number {
    // Round to 2 decimal places, but use whole numbers for small quantities
    if (value < 1) {
      return Math.round(value * 100) / 100
    }
    return Math.round(value * 10) / 10
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an estimate calculator instance
 */
export function createEstimateCalculator(organizationId: string): EstimateCalculator {
  return new EstimateCalculator(organizationId)
}

/**
 * Quick calculation without instantiating the class
 */
export async function calculateEstimateFromSurvey(
  survey: SiteSurvey,
  organizationId: string,
  options?: CalculatorOptions
): Promise<EstimateCalculation> {
  const calculator = new EstimateCalculator(organizationId)
  return calculator.calculateFromSurvey(survey, options)
}
