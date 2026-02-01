// Pricing Types for HazardOS

export type DisposalHazardType = 'asbestos_friable' | 'asbestos_non_friable' | 'mold' | 'lead' | 'other'

export interface LaborRate {
  id: string
  organization_id: string
  name: string
  rate_per_hour: number
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface EquipmentRate {
  id: string
  organization_id: string
  name: string
  rate_per_day: number
  description: string | null
  created_at: string
  updated_at: string
}

export interface MaterialCost {
  id: string
  organization_id: string
  name: string
  cost_per_unit: number
  unit: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface DisposalFee {
  id: string
  organization_id: string
  hazard_type: DisposalHazardType
  cost_per_cubic_yard: number
  description: string | null
  created_at: string
  updated_at: string
}

export interface TravelRate {
  id: string
  organization_id: string
  min_miles: number
  max_miles: number | null
  flat_fee: number | null
  per_mile_rate: number | null
  created_at: string
  updated_at: string
}

export interface PricingSettings {
  id: string
  organization_id: string
  default_markup_percent: number
  minimum_markup_percent: number
  maximum_markup_percent: number
  office_address_line1: string | null
  office_address_line2: string | null
  office_city: string | null
  office_state: string | null
  office_zip: string | null
  office_lat: number | null
  office_lng: number | null
  created_at: string
  updated_at: string
}

// Input types
export interface CreateLaborRateInput {
  name: string
  rate_per_hour: number
  description?: string
  is_default?: boolean
}

export type UpdateLaborRateInput = Partial<CreateLaborRateInput>

export interface CreateEquipmentRateInput {
  name: string
  rate_per_day: number
  description?: string
}

export type UpdateEquipmentRateInput = Partial<CreateEquipmentRateInput>

export interface CreateMaterialCostInput {
  name: string
  cost_per_unit: number
  unit: string
  description?: string
}

export type UpdateMaterialCostInput = Partial<CreateMaterialCostInput>

export interface CreateDisposalFeeInput {
  hazard_type: DisposalHazardType
  cost_per_cubic_yard: number
  description?: string
}

export type UpdateDisposalFeeInput = Partial<CreateDisposalFeeInput>

export interface CreateTravelRateInput {
  min_miles: number
  max_miles?: number | null
  flat_fee?: number | null
  per_mile_rate?: number | null
}

export type UpdateTravelRateInput = Partial<CreateTravelRateInput>

export interface UpdatePricingSettingsInput {
  default_markup_percent?: number
  minimum_markup_percent?: number
  maximum_markup_percent?: number
  office_address_line1?: string | null
  office_address_line2?: string | null
  office_city?: string | null
  office_state?: string | null
  office_zip?: string | null
  office_lat?: number | null
  office_lng?: number | null
}

// Display configs
export const disposalHazardTypeConfig: Record<DisposalHazardType, { label: string; description: string }> = {
  asbestos_friable: { label: 'Asbestos (Friable)', description: 'Easily crumbled asbestos materials' },
  asbestos_non_friable: { label: 'Asbestos (Non-Friable)', description: 'Bonded asbestos materials' },
  mold: { label: 'Mold', description: 'Mold contaminated materials' },
  lead: { label: 'Lead', description: 'Lead-based paint and materials' },
  other: { label: 'Other Hazardous', description: 'Other regulated materials' },
}

export const commonUnits = [
  { value: 'each', label: 'Each' },
  { value: 'roll', label: 'Roll' },
  { value: 'pair', label: 'Pair' },
  { value: 'box', label: 'Box' },
  { value: 'bag', label: 'Bag' },
  { value: 'gallon', label: 'Gallon' },
  { value: 'sqft', label: 'Sq Ft' },
  { value: 'lnft', label: 'Linear Ft' },
  { value: 'job', label: 'Per Job' },
]
