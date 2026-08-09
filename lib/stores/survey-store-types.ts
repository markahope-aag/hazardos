import type {
  SurveySection,
  SurveyFormData,
  PropertyData,
  AccessData,
  EnvironmentData,
  HazardsData,
  PhotoData,
  SurveyArea,
  AreaHazard,
} from './survey-types'
import type { createClient } from '@/lib/supabase/client'

/**
 * The survey store's contract, split out of survey-store.ts (883 lines) so the
 * shape, the sync actions, the validation rules and the store wiring are
 * separate units. No behavior change: these are the same declarations, exported.
 */

export type SupabaseLike = ReturnType<typeof createClient>

export type SectionValidation = { isValid: boolean; errors: string[] }

export const CONFLICT_MESSAGE =
  'This survey was changed on another device. Choose which version to keep.'

export interface SurveyState {
  // Survey identification
  currentSurveyId: string | null
  customerId: string | null
  organizationId: string | null

  // Form data
  formData: SurveyFormData

  // Navigation
  currentSection: SurveySection

  // State tracking
  isDirty: boolean
  lastSavedAt: string | null
  startedAt: string | null
  isSyncing: boolean
  syncError: string | null
  // Set when the tech hits Submit while offline. Persisted, so the pending
  // submission survives a tab close and completes when signal returns.
  // Otherwise "it will be submitted when you're back online" was a lie and the
  // survey stayed a draft forever.
  pendingSubmit: boolean

  // Optimistic-concurrency version guard. Holds the site_surveys.updated_at
  // value this device last loaded or successfully wrote. Every draft/submit
  // write is gated on it (WHERE updated_at = baseUpdatedAt); if another device
  // has since changed the row the write matches zero rows and we surface a
  // conflict instead of silently clobbering the other device's edits.
  baseUpdatedAt: string | null
  hasConflict: boolean

  // Validation state per section
  sectionValidation: Record<SurveySection, SectionValidation>

  // Actions
  setCurrentSurveyId: (id: string | null) => void
  setCustomerId: (id: string | null) => void
  setOrganizationId: (id: string | null) => void
  setCurrentSection: (section: SurveySection) => void
  setPendingSubmit: (pending: boolean) => void

  // Form data updates
  updateProperty: (data: Partial<PropertyData>) => void
  updateAccess: (data: Partial<AccessData>) => void
  updateEnvironment: (data: Partial<EnvironmentData>) => void
  updateHazards: (data: Partial<HazardsData>) => void
  updateNotes: (notes: string) => void

  // Area management
  addArea: () => string
  updateArea: (id: string, data: Partial<Omit<SurveyArea, 'id' | 'hazards' | 'photo_ids'>>) => void
  removeArea: (id: string) => void

  // Hazard management within areas
  addHazardToArea: (areaId: string) => string
  updateHazard: (areaId: string, hazardId: string, data: Partial<Omit<AreaHazard, 'id'>>) => void
  removeHazard: (areaId: string, hazardId: string) => void

  // Area photo linking
  linkPhotoToArea: (areaId: string, photoId: string) => void
  unlinkPhotoFromArea: (areaId: string, photoId: string) => void

  // Photos
  addPhoto: (photo: Omit<PhotoData, 'id'>) => string
  updatePhoto: (id: string, data: Partial<PhotoData>) => void
  removePhoto: (id: string) => void

  // Utility
  markSaved: () => void
  resetSurvey: () => void
  loadSurvey: (id: string, data: Partial<SurveyFormData>) => void

  // Database sync
  createSurveyInDb: () => Promise<string | null>
  loadSurveyFromDb: (surveyId: string) => Promise<boolean>
  saveDraft: () => Promise<boolean>
  submitSurvey: () => Promise<boolean>

  // Conflict resolution (X12): called when a save/submit is rejected because
  // the server copy changed on another device.
  resolveConflictUseLatest: () => Promise<boolean>
  resolveConflictKeepMine: () => Promise<boolean>

  // Validation
  validateSection: (section: SurveySection) => SectionValidation
  validateAll: () => boolean
}

/** The subset of SurveyState that survey-store-sync.ts provides. */
export type SurveySyncActions = Pick<
  SurveyState,
  | 'createSurveyInDb'
  | 'loadSurveyFromDb'
  | 'saveDraft'
  | 'submitSurvey'
  | 'resolveConflictUseLatest'
  | 'resolveConflictKeepMine'
>
