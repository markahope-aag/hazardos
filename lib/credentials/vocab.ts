/**
 * Client-safe display vocabulary for the compliance / credential-type UI.
 * Kept free of server imports so it can be used from client components.
 *
 * The category and applies-to values mirror the DB enums in
 * lib/validations/credential.ts; the hazard values mirror the opportunity
 * hazard vocabulary in lib/validations/pipeline.ts, and containment levels
 * mirror jobs.containment_level. Keeping these in sync is what makes the
 * crew-assignment gate resolve required credentials correctly.
 */

export interface Option<T extends string = string> {
  value: T
  label: string
}

export const CREDENTIAL_CATEGORY_OPTIONS: Option[] = [
  { value: 'worker_license', label: 'Worker license' },
  { value: 'rrp_certification', label: 'RRP certification' },
  { value: 'respirator_fit_test', label: 'Respirator fit test' },
  { value: 'medical_clearance', label: 'Medical clearance' },
  { value: 'equipment_calibration', label: 'Equipment calibration' },
  { value: 'other', label: 'Other' },
]

export const APPLIES_TO_OPTIONS: Option[] = [
  { value: 'worker', label: 'Worker' },
  { value: 'asset', label: 'Equipment / asset' },
]

export const CONTAINMENT_LEVEL_OPTIONS: Option[] = [
  { value: 'type_i', label: 'Type I' },
  { value: 'type_ii', label: 'Type II' },
  { value: 'type_iii', label: 'Type III' },
]

export const CREDENTIAL_HAZARD_OPTIONS: Option[] = [
  { value: 'asbestos', label: 'Asbestos' },
  { value: 'mold', label: 'Mold' },
  { value: 'lead', label: 'Lead' },
  { value: 'vermiculite', label: 'Vermiculite' },
  { value: 'other', label: 'Other' },
]

function labelFrom(options: Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value
}

export const credentialCategoryLabel = (value: string): string =>
  labelFrom(CREDENTIAL_CATEGORY_OPTIONS, value)

export const containmentLabel = (value: string): string =>
  labelFrom(CONTAINMENT_LEVEL_OPTIONS, value)

export const hazardLabel = (value: string): string =>
  labelFrom(CREDENTIAL_HAZARD_OPTIONS, value)

/**
 * Suggest an expiry date from an issue date plus a validity window, in whole
 * UTC days. Returns '' when either input is missing so callers can leave the
 * field for the user to fill. Pure and deterministic.
 */
export function suggestExpiry(
  issuedDate: string | null | undefined,
  defaultValidDays: number | null | undefined,
): string {
  if (!issuedDate || !defaultValidDays || defaultValidDays <= 0) return ''
  const d = new Date(`${issuedDate}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  d.setUTCDate(d.getUTCDate() + defaultValidDays)
  return d.toISOString().slice(0, 10)
}

/**
 * Format a stored YYYY-MM-DD date for display in the user's locale. Parsed at
 * local midnight so the calendar date shown matches what was entered. Returns
 * '—' for empty values.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Short human summary of what jobs a type is required for (for table cells). */
export function requiredForSummary(
  containmentLevels: string[] | null,
  hazardTypes: string[] | null,
): string {
  const parts: string[] = []
  if (containmentLevels?.length) parts.push(containmentLevels.map(containmentLabel).join(', '))
  if (hazardTypes?.length) parts.push(hazardTypes.map(hazardLabel).join(', '))
  return parts.join(' · ')
}
