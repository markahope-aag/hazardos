// Hard-coded pricing rules and fallbacks used by the estimate calculator.
// These are the "if the org hasn't configured X, here's what X costs"
// numbers — kept in one place so pricing tweaks don't require touching
// the calculation flow.

// ============================================================================
// Per-hazard calculation constants
// ============================================================================

/** Labor hours per square foot by hazard type and containment level. */
export const LABOR_HOURS_PER_SQFT: Record<string, Record<number, number>> = {
  asbestos: { 1: 0.15, 2: 0.25, 3: 0.35, 4: 0.5 },
  mold: { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4 },
  lead: { 1: 0.12, 2: 0.22, 3: 0.32, 4: 0.42 },
  vermiculite: { 1: 0.2, 2: 0.3, 3: 0.4, 4: 0.5 },
  other: { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4 },
}

/** Crew size by containment level (supervisor + technicians). */
export const CREW_SIZE_BY_CONTAINMENT: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
}

/** Equipment typically needed per hazard type. */
export const EQUIPMENT_BY_HAZARD: Record<string, string[]> = {
  asbestos: ['HEPA Vacuum', 'Negative Air Machine', 'Decontamination Unit', 'Air Monitoring Equipment'],
  mold: ['HEPA Vacuum', 'Air Scrubber', 'Dehumidifier', 'Moisture Meter'],
  lead: ['HEPA Vacuum', 'Lead Test Kit', 'Encapsulation Sprayer'],
  vermiculite: ['HEPA Vacuum', 'Negative Air Machine', 'Containment Materials'],
  other: ['HEPA Vacuum', 'Air Scrubber'],
}

/** Material requirements per square foot, by hazard type. */
export const MATERIALS_BY_HAZARD: Record<string, { name: string; qtyPerSqft: number; unit: string }[]> = {
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

/** Waste volume (cubic yards) produced per square foot of abatement. */
export const DISPOSAL_MULTIPLIER: Record<string, number> = {
  asbestos: 0.05,
  mold: 0.03,
  lead: 0.02,
  vermiculite: 0.08,
  other: 0.02,
}

// ============================================================================
// Fallback rates used when the org hasn't configured a matching pricing row
// ============================================================================

export function getDefaultEquipmentRate(name: string): number {
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

export function getDefaultMaterialRate(name: string): number {
  const defaults: Record<string, number> = {
    'Poly Sheeting (6 mil)': 0.15,
    'Poly Sheeting (4 mil)': 0.10,
    'Duct Tape': 8.0,
    'Disposal Bags (6 mil)': 5.0,
    'Disposal Bags': 3.5,
    'Warning Labels': 0.5,
    'Tyvek Suits': 12.0,
    'Respirator Filters': 15.0,
    'Antimicrobial Solution': 45.0,
    'HEPA Filters': 75.0,
    'Lead Encapsulant': 55.0,
  }
  return defaults[name] || 10.0
}

export function getDefaultDisposalRate(hazardType: string): number {
  const defaults: Record<string, number> = {
    asbestos: 450,
    mold: 150,
    lead: 350,
    vermiculite: 400,
    other: 100,
  }
  return defaults[hazardType] || 150
}

// ============================================================================
// Shared small helpers
// ============================================================================

/**
 * Map a CRM hazard type to the key used in the disposal_fees table. Asbestos
 * splits into friable/non-friable for disposal pricing; vermiculite rides on
 * the non-friable asbestos rate since the two are treated equivalently by
 * most landfills.
 */
export function mapToDisposalHazardType(
  hazardType: string,
  isFriable: boolean | null,
): string {
  if (hazardType === 'asbestos') {
    if (isFriable === false) return 'asbestos_non_friable'
    return 'asbestos_friable'
  }
  const mapping: Record<string, string> = {
    mold: 'mold',
    lead: 'lead',
    vermiculite: 'asbestos_non_friable',
    other: 'other',
  }
  return mapping[hazardType] || 'other'
}

/** Round to cents. */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Round quantity to a reasonable display precision:
 * - values under 1 → 2 decimals
 * - values ≥ 1 → 1 decimal
 */
export function roundQuantity(value: number): number {
  if (value < 1) {
    return Math.round(value * 100) / 100
  }
  return Math.round(value * 10) / 10
}
