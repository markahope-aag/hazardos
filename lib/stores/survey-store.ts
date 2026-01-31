'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  SurveySection,
  SurveyFormData,
  PropertyData,
  AccessData,
  EnvironmentData,
  HazardsData,
  PhotosData,
  PhotoData,
  AsbestosMaterial,
  MoldAffectedArea,
  LeadComponent,
  DEFAULT_SURVEY_FORM_DATA,
  DEFAULT_ASBESTOS_DATA,
  DEFAULT_MOLD_DATA,
  DEFAULT_LEAD_DATA,
  HazardType,
} from './survey-types'

interface SurveyState {
  // Survey identification
  currentSurveyId: string | null
  customerId: string | null

  // Form data
  formData: SurveyFormData

  // Navigation
  currentSection: SurveySection

  // State tracking
  isDirty: boolean
  lastSavedAt: string | null
  startedAt: string | null

  // Validation state per section
  sectionValidation: Record<SurveySection, { isValid: boolean; errors: string[] }>

  // Actions
  setCurrentSurveyId: (id: string | null) => void
  setCustomerId: (id: string | null) => void
  setCurrentSection: (section: SurveySection) => void

  // Form data updates
  updateProperty: (data: Partial<PropertyData>) => void
  updateAccess: (data: Partial<AccessData>) => void
  updateEnvironment: (data: Partial<EnvironmentData>) => void
  updateHazards: (data: Partial<HazardsData>) => void
  updateNotes: (notes: string) => void

  // Hazard type management
  toggleHazardType: (type: HazardType) => void

  // Asbestos materials
  addAsbestosMaterial: () => string
  updateAsbestosMaterial: (id: string, data: Partial<AsbestosMaterial>) => void
  removeAsbestosMaterial: (id: string) => void

  // Mold areas
  addMoldArea: () => string
  updateMoldArea: (id: string, data: Partial<MoldAffectedArea>) => void
  removeMoldArea: (id: string) => void

  // Lead components
  addLeadComponent: () => string
  updateLeadComponent: (id: string, data: Partial<LeadComponent>) => void
  removeLeadComponent: (id: string) => void

  // Photos
  addPhoto: (photo: Omit<PhotoData, 'id'>) => string
  updatePhoto: (id: string, data: Partial<PhotoData>) => void
  removePhoto: (id: string) => void

  // Utility
  markSaved: () => void
  resetSurvey: () => void
  loadSurvey: (id: string, data: Partial<SurveyFormData>) => void

  // Validation
  validateSection: (section: SurveySection) => { isValid: boolean; errors: string[] }
  validateAll: () => boolean
}

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Initial validation state
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
      formData: DEFAULT_SURVEY_FORM_DATA,
      currentSection: 'property',
      isDirty: false,
      lastSavedAt: null,
      startedAt: null,
      sectionValidation: initialSectionValidation,

      // Basic setters
      setCurrentSurveyId: (id) => set({ currentSurveyId: id }),
      setCustomerId: (id) => set({ customerId: id }),
      setCurrentSection: (section) => set({ currentSection: section }),

      // Property updates
      updateProperty: (data) =>
        set((state) => ({
          formData: {
            ...state.formData,
            property: { ...state.formData.property, ...data },
          },
          isDirty: true,
          startedAt: state.startedAt || new Date().toISOString(),
        })),

      // Access updates
      updateAccess: (data) =>
        set((state) => ({
          formData: {
            ...state.formData,
            access: { ...state.formData.access, ...data },
          },
          isDirty: true,
          startedAt: state.startedAt || new Date().toISOString(),
        })),

      // Environment updates
      updateEnvironment: (data) =>
        set((state) => ({
          formData: {
            ...state.formData,
            environment: { ...state.formData.environment, ...data },
          },
          isDirty: true,
          startedAt: state.startedAt || new Date().toISOString(),
        })),

      // Hazards updates
      updateHazards: (data) =>
        set((state) => ({
          formData: {
            ...state.formData,
            hazards: { ...state.formData.hazards, ...data },
          },
          isDirty: true,
          startedAt: state.startedAt || new Date().toISOString(),
        })),

      // Notes update
      updateNotes: (notes) =>
        set((state) => ({
          formData: { ...state.formData, notes },
          isDirty: true,
          startedAt: state.startedAt || new Date().toISOString(),
        })),

      // Toggle hazard type
      toggleHazardType: (type) =>
        set((state) => {
          const currentTypes = state.formData.hazards.types
          const hasType = currentTypes.includes(type)
          const newTypes = hasType
            ? currentTypes.filter((t) => t !== type)
            : [...currentTypes, type]

          // Initialize or clear hazard data based on selection
          const hazards = { ...state.formData.hazards, types: newTypes }

          if (type === 'asbestos') {
            hazards.asbestos = hasType ? null : DEFAULT_ASBESTOS_DATA
          } else if (type === 'mold') {
            hazards.mold = hasType ? null : DEFAULT_MOLD_DATA
          } else if (type === 'lead') {
            hazards.lead = hasType ? null : DEFAULT_LEAD_DATA
          } else if (type === 'other') {
            hazards.other = hasType ? null : { description: '', notes: '' }
          }

          return {
            formData: { ...state.formData, hazards },
            isDirty: true,
            startedAt: state.startedAt || new Date().toISOString(),
          }
        }),

      // Asbestos material management
      addAsbestosMaterial: () => {
        const id = generateId()
        set((state) => {
          if (!state.formData.hazards.asbestos) return state

          const newMaterial: AsbestosMaterial = {
            id,
            materialType: null,
            quantity: null,
            unit: 'sq_ft',
            location: '',
            condition: null,
            friable: false,
            pipeDiameter: null,
            pipeThickness: null,
            notes: '',
          }

          return {
            formData: {
              ...state.formData,
              hazards: {
                ...state.formData.hazards,
                asbestos: {
                  ...state.formData.hazards.asbestos,
                  materials: [...state.formData.hazards.asbestos.materials, newMaterial],
                },
              },
            },
            isDirty: true,
          }
        })
        return id
      },

      updateAsbestosMaterial: (id, data) =>
        set((state) => {
          if (!state.formData.hazards.asbestos) return state

          return {
            formData: {
              ...state.formData,
              hazards: {
                ...state.formData.hazards,
                asbestos: {
                  ...state.formData.hazards.asbestos,
                  materials: state.formData.hazards.asbestos.materials.map((m) =>
                    m.id === id ? { ...m, ...data } : m
                  ),
                },
              },
            },
            isDirty: true,
          }
        }),

      removeAsbestosMaterial: (id) =>
        set((state) => {
          if (!state.formData.hazards.asbestos) return state

          return {
            formData: {
              ...state.formData,
              hazards: {
                ...state.formData.hazards,
                asbestos: {
                  ...state.formData.hazards.asbestos,
                  materials: state.formData.hazards.asbestos.materials.filter((m) => m.id !== id),
                },
              },
            },
            isDirty: true,
          }
        }),

      // Mold area management
      addMoldArea: () => {
        const id = generateId()
        set((state) => {
          if (!state.formData.hazards.mold) return state

          const newArea: MoldAffectedArea = {
            id,
            location: '',
            squareFootage: null,
            materialType: null,
            materialsAffected: [],
            severity: null,
            moistureReading: null,
          }

          return {
            formData: {
              ...state.formData,
              hazards: {
                ...state.formData.hazards,
                mold: {
                  ...state.formData.hazards.mold,
                  affectedAreas: [...state.formData.hazards.mold.affectedAreas, newArea],
                },
              },
            },
            isDirty: true,
          }
        })
        return id
      },

      updateMoldArea: (id, data) =>
        set((state) => {
          if (!state.formData.hazards.mold) return state

          return {
            formData: {
              ...state.formData,
              hazards: {
                ...state.formData.hazards,
                mold: {
                  ...state.formData.hazards.mold,
                  affectedAreas: state.formData.hazards.mold.affectedAreas.map((a) =>
                    a.id === id ? { ...a, ...data } : a
                  ),
                },
              },
            },
            isDirty: true,
          }
        }),

      removeMoldArea: (id) =>
        set((state) => {
          if (!state.formData.hazards.mold) return state

          return {
            formData: {
              ...state.formData,
              hazards: {
                ...state.formData.hazards,
                mold: {
                  ...state.formData.hazards.mold,
                  affectedAreas: state.formData.hazards.mold.affectedAreas.filter((a) => a.id !== id),
                },
              },
            },
            isDirty: true,
          }
        }),

      // Lead component management
      addLeadComponent: () => {
        const id = generateId()
        set((state) => {
          if (!state.formData.hazards.lead) return state

          const newComponent: LeadComponent = {
            id,
            componentType: null,
            location: '',
            quantity: null,
            unit: 'sq_ft',
            condition: null,
          }

          return {
            formData: {
              ...state.formData,
              hazards: {
                ...state.formData.hazards,
                lead: {
                  ...state.formData.hazards.lead,
                  components: [...state.formData.hazards.lead.components, newComponent],
                },
              },
            },
            isDirty: true,
          }
        })
        return id
      },

      updateLeadComponent: (id, data) =>
        set((state) => {
          if (!state.formData.hazards.lead) return state

          return {
            formData: {
              ...state.formData,
              hazards: {
                ...state.formData.hazards,
                lead: {
                  ...state.formData.hazards.lead,
                  components: state.formData.hazards.lead.components.map((c) =>
                    c.id === id ? { ...c, ...data } : c
                  ),
                },
              },
            },
            isDirty: true,
          }
        }),

      removeLeadComponent: (id) =>
        set((state) => {
          if (!state.formData.hazards.lead) return state

          return {
            formData: {
              ...state.formData,
              hazards: {
                ...state.formData.hazards,
                lead: {
                  ...state.formData.hazards.lead,
                  components: state.formData.hazards.lead.components.filter((c) => c.id !== id),
                },
              },
            },
            isDirty: true,
          }
        }),

      // Photo management
      addPhoto: (photo) => {
        const id = generateId()
        set((state) => ({
          formData: {
            ...state.formData,
            photos: {
              photos: [...state.formData.photos.photos, { ...photo, id }],
            },
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
              photos: state.formData.photos.photos.map((p) =>
                p.id === id ? { ...p, ...data } : p
              ),
            },
          },
          isDirty: true,
        })),

      removePhoto: (id) =>
        set((state) => ({
          formData: {
            ...state.formData,
            photos: {
              photos: state.formData.photos.photos.filter((p) => p.id !== id),
            },
          },
          isDirty: true,
        })),

      // Utility functions
      markSaved: () =>
        set({
          isDirty: false,
          lastSavedAt: new Date().toISOString(),
        }),

      resetSurvey: () =>
        set({
          currentSurveyId: null,
          customerId: null,
          formData: DEFAULT_SURVEY_FORM_DATA,
          currentSection: 'property',
          isDirty: false,
          lastSavedAt: null,
          startedAt: null,
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

      // Validation
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
            const h = state.formData.hazards
            if (h.types.length === 0) errors.push('At least one hazard type must be selected')
            if (h.types.includes('asbestos') && h.asbestos?.materials.length === 0) {
              errors.push('At least one asbestos material must be documented')
            }
            if (h.types.includes('mold') && h.mold?.affectedAreas.length === 0) {
              errors.push('At least one mold affected area must be documented')
            }
            if (h.types.includes('lead') && h.lead?.components.length === 0) {
              errors.push('At least one lead component must be documented')
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
            // Review section validates all other sections
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
        formData: state.formData,
        currentSection: state.currentSection,
        startedAt: state.startedAt,
        lastSavedAt: state.lastSavedAt,
      }),
    }
  )
)
