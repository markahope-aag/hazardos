'use client'

import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  SurveySection,
  SurveyFormData,
  PropertyData,
  AccessData,
  EnvironmentData,
  HazardsData,
  PhotoData,
  SurveyArea,
  AreaHazard,
  DEFAULT_SURVEY_FORM_DATA,
  DEFAULT_SURVEY_AREA,
  DEFAULT_AREA_HAZARD,
} from './survey-types'
import { mapStoreToDb, mapDbToStore, createInitialDbRecord } from './survey-mappers'
import { createClient } from '@/lib/supabase/client'
import { createServiceLogger, formatError } from '@/lib/utils/logger'

const log = createServiceLogger('SurveyStore')

interface SurveyState {
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

  // Validation state per section
  sectionValidation: Record<SurveySection, { isValid: boolean; errors: string[] }>

  // Actions
  setCurrentSurveyId: (id: string | null) => void
  setCustomerId: (id: string | null) => void
  setOrganizationId: (id: string | null) => void
  setCurrentSection: (section: SurveySection) => void

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

  // Validation
  validateSection: (section: SurveySection) => { isValid: boolean; errors: string[] }
  validateAll: () => boolean
}

const generateId = () => `${Date.now()}-${nanoid(9)}`

// O(1) index helpers — build a map once, mutate by key, convert back to array
function updateInArray<T extends { id: string }>(items: T[], id: string, updater: (item: T) => T): T[] {
  const idx = items.findIndex((item) => item.id === id)
  if (idx === -1) return items
  const result = items.slice()
  result[idx] = updater(items[idx])
  return result
}

function removeFromArray<T extends { id: string }>(items: T[], id: string): T[] {
  const idx = items.findIndex((item) => item.id === id)
  if (idx === -1) return items
  const result = items.slice()
  result.splice(idx, 1)
  return result
}

const initialSectionValidation: Record<SurveySection, { isValid: boolean; errors: string[] }> = {
  property: { isValid: false, errors: [] },
  access: { isValid: false, errors: [] },
  environment: { isValid: false, errors: [] },
  hazards: { isValid: false, errors: [] },
  photos: { isValid: false, errors: [] },
  review: { isValid: false, errors: [] },
}

export const useSurveyStore = create<SurveyState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSurveyId: null,
      customerId: null,
      organizationId: null,
      formData: DEFAULT_SURVEY_FORM_DATA,
      currentSection: 'property',
      isDirty: false,
      lastSavedAt: null,
      startedAt: null,
      isSyncing: false,
      syncError: null,
      sectionValidation: initialSectionValidation,

      // Basic setters
      setCurrentSurveyId: (id) => set({ currentSurveyId: id }),
      setCustomerId: (id) => set({ customerId: id }),
      setOrganizationId: (id) => set({ organizationId: id }),
      setCurrentSection: (section) => set({ currentSection: section }),

      updateProperty: (data) =>
        set((state) => ({
          formData: { ...state.formData, property: { ...state.formData.property, ...data } },
          isDirty: true,
          startedAt: state.startedAt || new Date().toISOString(),
        })),

      updateAccess: (data) =>
        set((state) => ({
          formData: { ...state.formData, access: { ...state.formData.access, ...data } },
          isDirty: true,
          startedAt: state.startedAt || new Date().toISOString(),
        })),

      updateEnvironment: (data) =>
        set((state) => ({
          formData: { ...state.formData, environment: { ...state.formData.environment, ...data } },
          isDirty: true,
          startedAt: state.startedAt || new Date().toISOString(),
        })),

      updateHazards: (data) =>
        set((state) => ({
          formData: { ...state.formData, hazards: { ...state.formData.hazards, ...data } },
          isDirty: true,
          startedAt: state.startedAt || new Date().toISOString(),
        })),

      updateNotes: (notes) =>
        set((state) => ({
          formData: { ...state.formData, notes },
          isDirty: true,
          startedAt: state.startedAt || new Date().toISOString(),
        })),

      // ============================================
      // Area management
      // ============================================
      addArea: () => {
        const id = generateId()
        set((state) => ({
          formData: {
            ...state.formData,
            hazards: {
              ...state.formData.hazards,
              areas: [...state.formData.hazards.areas, { ...DEFAULT_SURVEY_AREA, id }],
            },
          },
          isDirty: true,
          startedAt: state.startedAt || new Date().toISOString(),
        }))
        return id
      },

      updateArea: (id, data) =>
        set((state) => ({
          formData: {
            ...state.formData,
            hazards: {
              ...state.formData.hazards,
              areas: updateInArray(state.formData.hazards.areas, id, (a) => ({ ...a, ...data })),
            },
          },
          isDirty: true,
        })),

      removeArea: (id) =>
        set((state) => ({
          formData: {
            ...state.formData,
            hazards: {
              ...state.formData.hazards,
              areas: removeFromArray(state.formData.hazards.areas, id),
            },
          },
          isDirty: true,
        })),

      // ============================================
      // Hazard management within areas
      // ============================================
      addHazardToArea: (areaId) => {
        const id = generateId()
        set((state) => ({
          formData: {
            ...state.formData,
            hazards: {
              ...state.formData.hazards,
              areas: updateInArray(state.formData.hazards.areas, areaId, (a) => ({
                ...a,
                hazards: [...a.hazards, { ...DEFAULT_AREA_HAZARD, id }],
              })),
            },
          },
          isDirty: true,
        }))
        return id
      },

      updateHazard: (areaId, hazardId, data) =>
        set((state) => ({
          formData: {
            ...state.formData,
            hazards: {
              ...state.formData.hazards,
              areas: updateInArray(state.formData.hazards.areas, areaId, (a) => ({
                ...a,
                hazards: updateInArray(a.hazards, hazardId, (h) => ({ ...h, ...data })),
              })),
            },
          },
          isDirty: true,
        })),

      removeHazard: (areaId, hazardId) =>
        set((state) => ({
          formData: {
            ...state.formData,
            hazards: {
              ...state.formData.hazards,
              areas: updateInArray(state.formData.hazards.areas, areaId, (a) => ({
                ...a,
                hazards: removeFromArray(a.hazards, hazardId),
              })),
            },
          },
          isDirty: true,
        })),

      // ============================================
      // Area photo linking
      // ============================================
      linkPhotoToArea: (areaId, photoId) =>
        set((state) => ({
          formData: {
            ...state.formData,
            hazards: {
              ...state.formData.hazards,
              areas: updateInArray(state.formData.hazards.areas, areaId, (a) =>
                a.photo_ids.includes(photoId) ? a : { ...a, photo_ids: [...a.photo_ids, photoId] }
              ),
            },
            photos: {
              photos: updateInArray(state.formData.photos.photos, photoId, (p) => ({ ...p, area_id: areaId })),
            },
          },
          isDirty: true,
        })),

      unlinkPhotoFromArea: (areaId, photoId) =>
        set((state) => ({
          formData: {
            ...state.formData,
            hazards: {
              ...state.formData.hazards,
              areas: updateInArray(state.formData.hazards.areas, areaId, (a) => ({
                ...a,
                photo_ids: a.photo_ids.filter((pid) => pid !== photoId),
              })),
            },
            photos: {
              photos: updateInArray(state.formData.photos.photos, photoId, (p) => ({ ...p, area_id: null })),
            },
          },
          isDirty: true,
        })),

      // ============================================
      // Photo management
      // ============================================
      addPhoto: (photo) => {
        const id = generateId()
        set((state) => ({
          formData: {
            ...state.formData,
            photos: { photos: [...state.formData.photos.photos, { ...photo, id }] },
          },
          isDirty: true,
        }))
        return id
      },

      updatePhoto: (id, data) =>
        set((state) => ({
          formData: {
            ...state.formData,
            photos: {
              photos: updateInArray(state.formData.photos.photos, id, (p) => ({ ...p, ...data })),
            },
          },
          isDirty: true,
        })),

      removePhoto: (id) =>
        set((state) => ({
          formData: {
            ...state.formData,
            photos: {
              photos: removeFromArray(state.formData.photos.photos, id),
            },
            // Also remove from any area photo_ids — only touches areas that reference this photo
            hazards: {
              ...state.formData.hazards,
              areas: state.formData.hazards.areas.map((a) =>
                a.photo_ids.includes(id)
                  ? { ...a, photo_ids: a.photo_ids.filter((pid) => pid !== id) }
                  : a
              ),
            },
          },
          isDirty: true,
        })),

      // ============================================
      // Utility
      // ============================================
      markSaved: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),

      resetSurvey: () =>
        set({
          currentSurveyId: null,
          customerId: null,
          formData: DEFAULT_SURVEY_FORM_DATA,
          currentSection: 'property',
          isDirty: false,
          lastSavedAt: null,
          startedAt: null,
          isSyncing: false,
          syncError: null,
          sectionValidation: initialSectionValidation,
        }),

      loadSurvey: (id, data) =>
        set({
          currentSurveyId: id,
          formData: {
            ...DEFAULT_SURVEY_FORM_DATA,
            ...data,
            property: { ...DEFAULT_SURVEY_FORM_DATA.property, ...data.property },
            access: { ...DEFAULT_SURVEY_FORM_DATA.access, ...data.access },
            environment: { ...DEFAULT_SURVEY_FORM_DATA.environment, ...data.environment },
            hazards: { ...DEFAULT_SURVEY_FORM_DATA.hazards, ...data.hazards },
            photos: { ...DEFAULT_SURVEY_FORM_DATA.photos, ...data.photos },
          },
          isDirty: false,
          startedAt: new Date().toISOString(),
        }),

      // ============================================
      // Database sync
      // ============================================
      createSurveyInDb: async () => {
        const state = get()
        const { organizationId, customerId } = state

        if (!organizationId) {
          log.error('Cannot create survey: organizationId is required')
          return null
        }

        set({ isSyncing: true, syncError: null })

        try {
          const supabase = createClient()
          const initialRecord = createInitialDbRecord(organizationId, customerId || undefined)

          const { data, error } = await supabase
            .from('site_surveys')
            .insert(initialRecord)
            .select('id')
            .single()

          if (error) throw error

          set({
            currentSurveyId: data.id,
            isSyncing: false,
            startedAt: new Date().toISOString(),
          })

          return data.id
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create survey'
          set({ isSyncing: false, syncError: message })
          log.error({ error: formatError(error, 'CREATE_SURVEY_ERROR') }, 'Create survey error')
          return null
        }
      },

      loadSurveyFromDb: async (surveyId: string) => {
        set({ isSyncing: true, syncError: null })

        try {
          const supabase = createClient()
          const { data, error } = await supabase
            .from('site_surveys')
            .select('*')
            .eq('id', surveyId)
            .single()

          if (error) throw error

          const storeData = mapDbToStore(data)

          set({
            currentSurveyId: storeData.currentSurveyId || surveyId,
            customerId: storeData.customerId || null,
            formData: storeData.formData || DEFAULT_SURVEY_FORM_DATA,
            startedAt: storeData.startedAt || null,
            isDirty: false,
            isSyncing: false,
            lastSavedAt: data.updated_at,
          })

          return true
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load survey'
          set({ isSyncing: false, syncError: message })
          log.error({ error: formatError(error, 'LOAD_SURVEY_ERROR'), surveyId }, 'Load survey error')
          return false
        }
      },

      saveDraft: async () => {
        const state = get()
        const { currentSurveyId, organizationId } = state

        if (!currentSurveyId) {
          const newId = await get().createSurveyInDb()
          if (!newId) return false
        }

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          set({ isDirty: false, lastSavedAt: new Date().toISOString() })
          return true
        }

        if (!organizationId) {
          log.warn('Cannot sync to database: organizationId is required')
          set({ isDirty: false, lastSavedAt: new Date().toISOString() })
          return true
        }

        set({ isSyncing: true, syncError: null })

        try {
          const supabase = createClient()
          const dbData = mapStoreToDb(
            {
              currentSurveyId: get().currentSurveyId,
              customerId: get().customerId,
              formData: get().formData,
              startedAt: get().startedAt,
            },
            organizationId,
            { status: 'draft' }
          )

          const { error } = await supabase
            .from('site_surveys')
            .update(dbData)
            .eq('id', get().currentSurveyId)

          if (error) throw error

          set({ isDirty: false, isSyncing: false, lastSavedAt: new Date().toISOString() })
          return true
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to save draft'
          set({ isSyncing: false, syncError: message })
          log.error({ error: formatError(error, 'SAVE_DRAFT_ERROR') }, 'Save draft error')
          return false
        }
      },

      submitSurvey: async () => {
        const state = get()
        const { currentSurveyId, organizationId } = state

        if (!currentSurveyId || !organizationId) {
          log.error('Cannot submit: surveyId and organizationId are required')
          return false
        }

        if (!get().validateAll()) {
          log.error('Cannot submit: validation failed')
          return false
        }

        set({ isSyncing: true, syncError: null })

        try {
          const supabase = createClient()
          const submittedAt = new Date().toISOString()
          const dbData = mapStoreToDb(
            {
              currentSurveyId,
              customerId: state.customerId,
              formData: state.formData,
              startedAt: state.startedAt,
            },
            organizationId,
            { status: 'submitted', submittedAt }
          )

          const { error } = await supabase
            .from('site_surveys')
            .update(dbData)
            .eq('id', currentSurveyId)

          if (error) throw error

          set({ isDirty: false, isSyncing: false, lastSavedAt: submittedAt })
          return true
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to submit survey'
          set({ isSyncing: false, syncError: message })
          log.error({ error: formatError(error, 'SUBMIT_SURVEY_ERROR') }, 'Submit survey error')
          return false
        }
      },

      // ============================================
      // Validation
      // ============================================
      validateSection: (section) => {
        const state = get()
        const errors: string[] = []

        switch (section) {
          case 'property': {
            const p = state.formData.property
            if (!p.address) errors.push('Address is required')
            if (!p.city) errors.push('City is required')
            if (!p.state) errors.push('State is required')
            if (!p.zip) errors.push('ZIP code is required')
            if (!p.buildingType) errors.push('Building type is required')
            break
          }
          case 'access': {
            const a = state.formData.access
            if (a.hasRestrictions === null) errors.push('Access restrictions question is required')
            if (a.parkingAvailable === null) errors.push('Parking availability is required')
            if (!a.equipmentAccess) errors.push('Equipment access is required')
            break
          }
          case 'environment': {
            const e = state.formData.environment
            if (e.temperature === null) errors.push('Temperature is required')
            if (e.humidity === null) errors.push('Humidity is required')
            if (e.hasStructuralConcerns === null) errors.push('Structural concerns question is required')
            if (e.utilityShutoffsLocated === null) errors.push('Utility shutoffs question is required')
            break
          }
          case 'hazards': {
            const { areas } = state.formData.hazards
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
            const photos = state.formData.photos.photos
            const exteriorCount = photos.filter((p) => p.category === 'exterior').length
            if (exteriorCount < 4) errors.push(`${4 - exteriorCount} more exterior photos required`)
            break
          }
          case 'review': {
            const allValid = ['property', 'access', 'environment', 'hazards', 'photos'].every(
              (s) => state.validateSection(s as SurveySection).isValid
            )
            if (!allValid) errors.push('Please complete all required sections')
            break
          }
        }

        const result = { isValid: errors.length === 0, errors }
        set((state) => ({
          sectionValidation: { ...state.sectionValidation, [section]: result },
        }))
        return result
      },

      validateAll: () => {
        const state = get()
        const sections: SurveySection[] = ['property', 'access', 'environment', 'hazards', 'photos']
        return sections.every((s) => state.validateSection(s).isValid)
      },
    }),
    {
      name: 'hazardos-survey-draft',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentSurveyId: state.currentSurveyId,
        customerId: state.customerId,
        organizationId: state.organizationId,
        formData: state.formData,
        currentSection: state.currentSection,
        startedAt: state.startedAt,
        lastSavedAt: state.lastSavedAt,
      }),
    }
  )
)
