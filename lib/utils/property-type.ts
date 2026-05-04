import type { PropertyType } from '@/types/database'

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  residential_single_family: 'Single-family',
  residential_multi_family: 'Multi-family',
  commercial: 'Commercial',
  industrial: 'Industrial',
  government: 'Government',
}

// Collapses the granular enum to the binary the office cares about for
// list-view filtering and routing. Industrial and government properties
// behave like commercial work for our purposes.
export function residentialOrCommercial(
  type: PropertyType | null | undefined,
): 'residential' | 'commercial' | null {
  if (!type) return null
  if (type === 'residential_single_family' || type === 'residential_multi_family') {
    return 'residential'
  }
  return 'commercial'
}

export function propertyTypeBadgeClass(
  type: PropertyType | null | undefined,
): string {
  const bucket = residentialOrCommercial(type)
  if (bucket === 'residential') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (bucket === 'commercial') return 'bg-blue-100 text-blue-700 border-blue-200'
  return 'bg-gray-100 text-gray-600 border-gray-200'
}
