import type {
  LaborRate,
  EquipmentRate,
  MaterialCost,
  DisposalFee,
  TravelRate,
  PricingSettings,
} from '@/types/pricing'

export interface PricingData {
  labor_rates: LaborRate[]
  equipment_rates: EquipmentRate[]
  material_costs: MaterialCost[]
  disposal_fees: DisposalFee[]
  travel_rates: TravelRate[]
  settings: PricingSettings | null
}

export interface PricingTabProps {
  data: PricingData
  onDataChange: () => void
}
