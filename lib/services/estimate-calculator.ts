import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SiteSurvey,
  LaborRate,
  EquipmentRate,
  MaterialCost,
  DisposalFee,
  TravelRate,
  PricingSetting,
} from '@/types/database'
import type { CalculatedLineItem, EstimateCalculation } from '@/types/estimates'
import { roundCurrency } from './estimate-pricing-rules'
import {
  calculateLaborItems,
  calculateEquipmentItems,
  calculateMaterialItems,
  calculateDisposalItems,
  calculateTravelItems,
  calculateTestingItems,
  calculatePermitItems,
} from './estimate-line-item-calculators'

// ============================================================================
// Types
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

// Hazard assessment JSONB types from mobile survey form
interface AsbestosMaterial {
  materialType: string
  quantity: number
  unit: string
  location: string
  condition: string
  friable: boolean
}

interface MoldArea {
  location: string
  squareFootage: number
  materialType: string
  severity: string
}

interface LeadComponent {
  componentType: string
  location: string
  quantity: number
  unit: string
  condition: string
}

interface HazardAssessments {
  types?: string[]
  asbestos?: {
    materials?: AsbestosMaterial[]
    estimatedWasteVolume?: number
    containmentLevel?: number
    epaNotificationRequired?: boolean
  }
  mold?: {
    affectedAreas?: MoldArea[]
  }
  lead?: {
    components?: LeadComponent[]
    totalWorkArea?: number
    rrpRuleApplies?: boolean
  }
}

// ============================================================================
// Calculator
// ============================================================================

/**
 * Orchestrates a site-survey → estimate calculation. Pricing constants and
 * fallback rates live in ./estimate-pricing-rules; the per-category line
 * item arithmetic lives in ./estimate-line-item-calculators. This class
 * owns the org-scoped DB fetch for pricing data, parses the JSONB hazard
 * assessments from the survey, and composes the line items into a total.
 */
export class EstimateCalculator {
  private organizationId: string
  private supabase: SupabaseClient
  private pricingData: PricingData | null = null

  constructor(organizationId: string, supabase: SupabaseClient) {
    this.organizationId = organizationId
    this.supabase = supabase
  }

  async loadPricingData(): Promise<void> {
    const [laborRes, equipmentRes, materialRes, disposalRes, travelRes, settingsRes] =
      await Promise.all([
        this.supabase.from('labor_rates').select('*').eq('organization_id', this.organizationId),
        this.supabase.from('equipment_rates').select('*').eq('organization_id', this.organizationId),
        this.supabase.from('material_costs').select('*').eq('organization_id', this.organizationId),
        this.supabase.from('disposal_fees').select('*').eq('organization_id', this.organizationId),
        this.supabase.from('travel_rates').select('*').eq('organization_id', this.organizationId),
        this.supabase
          .from('pricing_settings')
          .select('*')
          .eq('organization_id', this.organizationId)
          .single(),
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
   * Calculate an estimate from a site survey. Uses the hazard_assessments
   * JSONB for multi-hazard detail when available, falling back to the flat
   * survey fields (hazard_type, area_sqft, containment_level) otherwise.
   */
  async calculateFromSurvey(
    survey: SiteSurvey,
    options: CalculatorOptions = {},
  ): Promise<EstimateCalculation> {
    if (!this.pricingData) {
      await this.loadPricingData()
    }
    const pricing = this.pricingData!

    const lineItems: CalculatedLineItem[] = []
    let sortOrder = 0

    const assessments = (survey as Record<string, unknown>).hazard_assessments as HazardAssessments | null
    const hazardTypes = assessments?.types?.length
      ? assessments.types
      : [survey.hazard_type || 'other']

    for (const hazardType of hazardTypes) {
      const { areaSqft, containmentLevel, wasteVolumeCuYd, isFriable, needsPermits } =
        this.deriveParamsFromAssessments(hazardType, assessments, survey)

      const laborItems = calculateLaborItems(pricing, hazardType, areaSqft, containmentLevel, sortOrder)
      lineItems.push(...laborItems)
      sortOrder += laborItems.length

      const equipmentItems = calculateEquipmentItems(pricing, hazardType, containmentLevel, sortOrder)
      lineItems.push(...equipmentItems)
      sortOrder += equipmentItems.length

      const materialItems = calculateMaterialItems(pricing, hazardType, areaSqft, sortOrder)
      lineItems.push(...materialItems)
      sortOrder += materialItems.length

      const disposalItems = calculateDisposalItems(
        pricing,
        hazardType,
        areaSqft,
        wasteVolumeCuYd,
        isFriable,
        sortOrder,
      )
      lineItems.push(...disposalItems)
      sortOrder += disposalItems.length

      if (options.includeTesting !== false && survey.clearance_required) {
        const testingItems = calculateTestingItems(hazardType, areaSqft, sortOrder)
        lineItems.push(...testingItems)
        sortOrder += testingItems.length
      }

      const shouldIncludePermits = needsPermits || survey.regulatory_notifications_needed
      if (options.includePermits !== false && shouldIncludePermits) {
        const permitItems = calculatePermitItems(hazardType, sortOrder)
        lineItems.push(...permitItems)
        sortOrder += permitItems.length
      }
    }

    // Travel is charged once per job, not per hazard type.
    if (options.includeTravel !== false) {
      const travelItems = calculateTravelItems(pricing, sortOrder)
      lineItems.push(...travelItems)
      sortOrder += travelItems.length
    }

    const subtotal = lineItems
      .filter((item) => item.is_included)
      .reduce((sum, item) => sum + item.total_price, 0)

    const markupPercent =
      options.customMarkup ?? this.pricingData?.pricingSettings?.default_markup_percent ?? 20
    const markupAmount = subtotal * (markupPercent / 100)

    const discountPercent = 0
    const discountAmount = 0
    const taxPercent = 0
    const taxAmount = 0

    const total = subtotal + markupAmount - discountAmount + taxAmount

    return {
      line_items: lineItems,
      subtotal: roundCurrency(subtotal),
      markup_percent: markupPercent,
      markup_amount: roundCurrency(markupAmount),
      discount_percent: discountPercent,
      discount_amount: roundCurrency(discountAmount),
      tax_percent: taxPercent,
      tax_amount: roundCurrency(taxAmount),
      total: roundCurrency(total),
    }
  }

  /**
   * Pull per-hazard inputs out of the survey. Prefers the JSONB assessment
   * block (detailed field notes) and falls back to the flat legacy columns
   * when the mobile survey didn't supply assessment data.
   */
  private deriveParamsFromAssessments(
    hazardType: string,
    assessments: HazardAssessments | null,
    survey: SiteSurvey,
  ): {
    areaSqft: number
    containmentLevel: number
    wasteVolumeCuYd: number | null
    isFriable: boolean | null
    needsPermits: boolean
  } {
    let areaSqft = this.calculateArea(survey)
    let containmentLevel = survey.containment_level || 1
    let wasteVolumeCuYd: number | null = survey.volume_cuft ? survey.volume_cuft / 27 : null
    let isFriable: boolean | null = null
    let needsPermits = false

    if (!assessments) {
      return { areaSqft, containmentLevel, wasteVolumeCuYd, isFriable, needsPermits }
    }

    switch (hazardType) {
      case 'asbestos': {
        const asb = assessments.asbestos
        if (asb) {
          if (asb.materials?.length) {
            areaSqft = asb.materials.reduce((sum, m) => sum + (m.quantity || 0), 0) || areaSqft
            isFriable = asb.materials.some((m) => m.friable)
          }
          if (asb.containmentLevel) containmentLevel = asb.containmentLevel
          if (asb.estimatedWasteVolume) wasteVolumeCuYd = asb.estimatedWasteVolume
          if (asb.epaNotificationRequired) needsPermits = true
        }
        break
      }
      case 'mold': {
        const mold = assessments.mold
        if (mold?.affectedAreas?.length) {
          const totalSqft = mold.affectedAreas.reduce(
            (sum, a) => sum + (a.squareFootage || 0),
            0,
          )
          if (totalSqft > 0) areaSqft = totalSqft
        }
        break
      }
      case 'lead': {
        const lead = assessments.lead
        if (lead) {
          if (lead.totalWorkArea && lead.totalWorkArea > 0) areaSqft = lead.totalWorkArea
          if (lead.rrpRuleApplies) needsPermits = true
        }
        break
      }
    }

    return { areaSqft, containmentLevel, wasteVolumeCuYd, isFriable, needsPermits }
  }

  /**
   * Work out a square-footage number from whatever the survey captured.
   * Order of preference: area, linear feet (assumes 2-foot-wide strip),
   * cubic feet (assumes 8-foot ceiling), then a safe fallback.
   */
  private calculateArea(survey: SiteSurvey): number {
    if (survey.area_sqft && survey.area_sqft > 0) {
      return survey.area_sqft
    }
    if (survey.linear_ft && survey.linear_ft > 0) {
      return survey.linear_ft * 2
    }
    if (survey.volume_cuft && survey.volume_cuft > 0) {
      return survey.volume_cuft / 8
    }
    return 100
  }
}

// ============================================================================
// Convenience factories
// ============================================================================

export function createEstimateCalculator(
  organizationId: string,
  supabase: SupabaseClient,
): EstimateCalculator {
  return new EstimateCalculator(organizationId, supabase)
}

export async function calculateEstimateFromSurvey(
  survey: SiteSurvey,
  organizationId: string,
  supabase: SupabaseClient,
  options?: CalculatorOptions,
): Promise<EstimateCalculation> {
  const calculator = new EstimateCalculator(organizationId, supabase)
  return calculator.calculateFromSurvey(survey, options)
}
