import type {
  LaborRate,
  EquipmentRate,
  MaterialCost,
  DisposalFee,
  TravelRate,
} from '@/types/database'
import type { CalculatedLineItem } from '@/types/estimates'
import {
  LABOR_HOURS_PER_SQFT,
  CREW_SIZE_BY_CONTAINMENT,
  EQUIPMENT_BY_HAZARD,
  MATERIALS_BY_HAZARD,
  DISPOSAL_MULTIPLIER,
  getDefaultEquipmentRate,
  getDefaultMaterialRate,
  getDefaultDisposalRate,
  mapToDisposalHazardType,
  roundCurrency,
  roundQuantity,
} from './estimate-pricing-rules'

/**
 * Pure per-category line-item calculators. Each one takes the org's loaded
 * pricing data (rates from the labor_rates / equipment_rates / etc. tables)
 * and returns a slice of CalculatedLineItem[] starting at `startOrder`.
 * Split out of the EstimateCalculator class so the orchestration logic in
 * calculateFromSurvey stays readable — these are the heavy arithmetic.
 */

interface PricingDataSubset {
  laborRates: LaborRate[]
  equipmentRates: EquipmentRate[]
  materialCosts: MaterialCost[]
  disposalFees: DisposalFee[]
  travelRates: TravelRate[]
}

const withSortOrder = (items: CalculatedLineItem[], startOrder: number): CalculatedLineItem[] =>
  items.map((item, idx) => ({ ...item, sort_order: startOrder + idx }) as CalculatedLineItem)

export function calculateLaborItems(
  pricingData: PricingDataSubset,
  hazardType: string,
  areaSqft: number,
  containmentLevel: number,
  startOrder: number,
): CalculatedLineItem[] {
  const items: CalculatedLineItem[] = []
  const hoursPerSqft = LABOR_HOURS_PER_SQFT[hazardType]?.[containmentLevel] || 0.2
  const crewSize = CREW_SIZE_BY_CONTAINMENT[containmentLevel] || 2
  const totalHours = areaSqft * hoursPerSqft

  const supervisorRate = pricingData.laborRates.find((r) =>
    r.name.toLowerCase().includes('supervisor'),
  )
  const technicianRate = pricingData.laborRates.find(
    (r) =>
      r.name.toLowerCase().includes('technician') ||
      r.name.toLowerCase().includes('worker'),
  )

  const defaultSupervisorRate = 85
  const defaultTechnicianRate = 55

  const supervisorHours = totalHours
  const supervisorUnitPrice = supervisorRate?.rate_per_hour || defaultSupervisorRate
  items.push({
    item_type: 'labor',
    category: 'Supervisor',
    description: `Project Supervisor (${hazardType})`,
    quantity: roundQuantity(supervisorHours),
    unit: 'hour',
    unit_price: supervisorUnitPrice,
    total_price: roundCurrency(supervisorHours * supervisorUnitPrice),
    source_rate_id: supervisorRate?.id,
    source_table: 'labor_rates',
    is_optional: false,
    is_included: true,
  })

  const techCount = Math.max(crewSize - 1, 1)
  const technicianHours = totalHours * techCount
  const technicianUnitPrice = technicianRate?.rate_per_hour || defaultTechnicianRate
  items.push({
    item_type: 'labor',
    category: 'Technician',
    description: `Abatement Technicians x${techCount} (${hazardType})`,
    quantity: roundQuantity(technicianHours),
    unit: 'hour',
    unit_price: technicianUnitPrice,
    total_price: roundCurrency(technicianHours * technicianUnitPrice),
    source_rate_id: technicianRate?.id,
    source_table: 'labor_rates',
    is_optional: false,
    is_included: true,
  })

  return withSortOrder(items, startOrder)
}

export function calculateEquipmentItems(
  pricingData: PricingDataSubset,
  hazardType: string,
  containmentLevel: number,
  startOrder: number,
): CalculatedLineItem[] {
  const items: CalculatedLineItem[] = []
  const neededEquipment = EQUIPMENT_BY_HAZARD[hazardType] || EQUIPMENT_BY_HAZARD.other
  const estimatedDays = Math.max(containmentLevel, 2)

  for (const equipmentName of neededEquipment) {
    const rate = pricingData.equipmentRates.find(
      (r) =>
        r.name.toLowerCase().includes(equipmentName.toLowerCase()) ||
        equipmentName.toLowerCase().includes(r.name.toLowerCase()),
    )

    const dailyRate = rate?.rate_per_day || getDefaultEquipmentRate(equipmentName)

    items.push({
      item_type: 'equipment',
      category: 'Equipment Rental',
      description: equipmentName,
      quantity: estimatedDays,
      unit: 'day',
      unit_price: dailyRate,
      total_price: roundCurrency(estimatedDays * dailyRate),
      source_rate_id: rate?.id,
      source_table: 'equipment_rates',
      is_optional: false,
      is_included: true,
    })
  }

  return withSortOrder(items, startOrder)
}

export function calculateMaterialItems(
  pricingData: PricingDataSubset,
  hazardType: string,
  areaSqft: number,
  startOrder: number,
): CalculatedLineItem[] {
  const items: CalculatedLineItem[] = []
  const materialList = MATERIALS_BY_HAZARD[hazardType] || MATERIALS_BY_HAZARD.other

  for (const material of materialList) {
    const quantity = areaSqft * material.qtyPerSqft

    const cost = pricingData.materialCosts.find(
      (m) =>
        m.name.toLowerCase().includes(material.name.toLowerCase()) ||
        material.name.toLowerCase().includes(m.name.toLowerCase()),
    )

    const unitPrice = cost?.cost_per_unit || getDefaultMaterialRate(material.name)

    items.push({
      item_type: 'material',
      category: 'Materials',
      description: material.name,
      quantity: roundQuantity(quantity),
      unit: material.unit,
      unit_price: unitPrice,
      total_price: roundCurrency(quantity * unitPrice),
      source_rate_id: cost?.id,
      source_table: 'material_costs',
      is_optional: false,
      is_included: true,
    })
  }

  return withSortOrder(items, startOrder)
}

export function calculateDisposalItems(
  pricingData: PricingDataSubset,
  hazardType: string,
  areaSqft: number,
  wasteVolumeCuYd: number | null,
  isFriable: boolean | null,
  startOrder: number,
): CalculatedLineItem[] {
  // Use the caller's waste volume (from survey hazard_assessments) when
  // provided; otherwise estimate from the work area.
  let volume: number
  if (wasteVolumeCuYd && wasteVolumeCuYd > 0) {
    volume = wasteVolumeCuYd
  } else {
    const multiplier = DISPOSAL_MULTIPLIER[hazardType] || 0.02
    volume = areaSqft * multiplier
  }

  const disposalHazardType = mapToDisposalHazardType(hazardType, isFriable)
  const fee = pricingData.disposalFees.find((f) => f.hazard_type === disposalHazardType)
  const unitPrice = fee?.cost_per_cubic_yard || getDefaultDisposalRate(hazardType)

  const items: CalculatedLineItem[] = [
    {
      item_type: 'disposal',
      category: 'Waste Disposal',
      description: `${hazardType.charAt(0).toUpperCase() + hazardType.slice(1)} Waste Disposal`,
      quantity: roundQuantity(volume),
      unit: 'cubic yard',
      unit_price: unitPrice,
      total_price: roundCurrency(volume * unitPrice),
      source_rate_id: fee?.id,
      source_table: 'disposal_fees',
      is_optional: false,
      is_included: true,
    },
  ]

  return withSortOrder(items, startOrder)
}

export function calculateTravelItems(
  pricingData: PricingDataSubset,
  startOrder: number,
): CalculatedLineItem[] {
  // First configured travel rate wins. Fall back to a flat $250 mobilization
  // charge if the org hasn't set any travel rates.
  const rate = pricingData.travelRates
    .slice()
    .sort((a, b) => a.min_miles - b.min_miles)
    .find((r) => r.flat_fee || r.per_mile_rate)

  const items: CalculatedLineItem[] = []
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

  return withSortOrder(items, startOrder)
}

export function calculateTestingItems(
  hazardType: string,
  areaSqft: number,
  startOrder: number,
): CalculatedLineItem[] {
  const sampleCount = Math.max(Math.ceil(areaSqft / 500), 3)

  const testingCosts: Record<string, { name: string; costPerSample: number }> = {
    asbestos: { name: 'Air Clearance Testing (PCM)', costPerSample: 150 },
    mold: { name: 'Post-Remediation Verification', costPerSample: 175 },
    lead: { name: 'Lead Clearance Testing', costPerSample: 125 },
    vermiculite: { name: 'Air Clearance Testing', costPerSample: 150 },
    other: { name: 'Environmental Testing', costPerSample: 100 },
  }

  const testing = testingCosts[hazardType] || testingCosts.other

  const items: CalculatedLineItem[] = [
    {
      item_type: 'testing',
      category: 'Testing',
      description: testing.name,
      quantity: sampleCount,
      unit: 'sample',
      unit_price: testing.costPerSample,
      total_price: roundCurrency(sampleCount * testing.costPerSample),
      is_optional: true,
      is_included: true,
    },
  ]

  return withSortOrder(items, startOrder)
}

export function calculatePermitItems(
  hazardType: string,
  startOrder: number,
): CalculatedLineItem[] {
  const permitCosts: Record<string, { name: string; cost: number }[]> = {
    asbestos: [
      { name: 'EPA Notification', cost: 350 },
      { name: 'State Permit Fee', cost: 250 },
    ],
    mold: [{ name: 'Local Permit', cost: 150 }],
    lead: [
      { name: 'EPA RRP Notification', cost: 200 },
      { name: 'State Permit Fee', cost: 175 },
    ],
    vermiculite: [{ name: 'EPA Notification', cost: 350 }],
    other: [{ name: 'General Permit', cost: 100 }],
  }

  const permits = permitCosts[hazardType] || permitCosts.other

  const items: CalculatedLineItem[] = permits.map((permit) => ({
    item_type: 'permit',
    category: 'Permits & Fees',
    description: permit.name,
    quantity: 1,
    unit: 'each',
    unit_price: permit.cost,
    total_price: permit.cost,
    is_optional: true,
    is_included: true,
  }))

  return withSortOrder(items, startOrder)
}
