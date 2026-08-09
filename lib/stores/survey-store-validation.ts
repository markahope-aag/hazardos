import { PHOTO_REQUIREMENTS, type SurveyFormData, type SurveySection } from './survey-types'

/**
 * The rules that decide whether a section of a site survey is complete enough
 * to submit, split out of survey-store.ts as pure functions over form data.
 *
 * `review` is deliberately NOT handled here. It is defined as "every other
 * section is valid", and in the store that is evaluated by calling
 * `validateSection` recursively, which also writes each sub-section's result
 * into `sectionValidation` as a side effect. Components read those entries to
 * decide which step indicators show a warning, so re-implementing `review` as a
 * pure check would leave those entries stale. The recursion stays in the store
 * where the side effect belongs.
 */

/** Sections with their own rules. `review` is derived from all of these. */
export type LeafSection = Exclude<SurveySection, 'review'>

export const LEAF_SECTIONS: LeafSection[] = [
  'property',
  'access',
  'environment',
  'hazards',
  'photos',
]

export function collectLeafSectionErrors(
  formData: SurveyFormData,
  section: LeafSection
): string[] {
  const errors: string[] = []

  switch (section) {
    case 'property': {
      const p = formData.property
      if (!p.address) errors.push('Address is required')
      if (!p.city) errors.push('City is required')
      if (!p.state) errors.push('State is required')
      if (!p.zip) errors.push('ZIP code is required')
      if (!p.buildingType) errors.push('Building type is required')
      break
    }
    case 'access': {
      const a = formData.access
      if (a.hasRestrictions === null) errors.push('Access restrictions question is required')
      if (a.parkingAvailable === null) errors.push('Parking availability is required')
      if (!a.equipmentAccess) errors.push('Equipment access is required')
      break
    }
    case 'environment': {
      const e = formData.environment
      if (e.temperature === null) errors.push('Temperature is required')
      if (e.humidity === null) errors.push('Humidity is required')
      if (e.hasStructuralConcerns === null)
        errors.push('Structural concerns question is required')
      if (e.powerWaterAvailable === null) errors.push('Utility shutoffs question is required')
      break
    }
    case 'hazards': {
      const { areas } = formData.hazards
      if (areas.length === 0) {
        errors.push('At least one area must be documented')
      } else {
        let noHazards = 0
        let unnamed = 0
        for (const a of areas) {
          if (a.hazards.length === 0) noHazards++
          if (!a.area_name.trim()) unnamed++
        }
        if (noHazards > 0) errors.push(`${noHazards} area(s) have no hazards documented`)
        if (unnamed > 0) errors.push(`${unnamed} area(s) are missing a name`)
      }
      break
    }
    case 'photos': {
      const photos = formData.photos.photos
      const exteriorCount = photos.filter((p) => p.category === 'exterior').length
      // Single source of truth. This used to hardcode 4 alongside
      // PHOTO_REQUIREMENTS, so changing the requirement in one place left the
      // other disagreeing.
      const exteriorRequired = PHOTO_REQUIREMENTS.exterior.required
      if (exteriorCount < exteriorRequired) {
        const short = exteriorRequired - exteriorCount
        errors.push(`${short} more exterior photo${short === 1 ? '' : 's'} required`)
      }
      break
    }
  }

  return errors
}
