'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  DEFAULT_SURVEY_FORM_DATA,
  DEFAULT_SURVEY_AREA,
  DEFAULT_AREA_HAZARD,
} from './survey-types'
import {
  generateId,
  initialSectionValidation,
  isSameValidation,
  removeFromArray,
  updateInArray,
} from './survey-store-helpers'
import { collectLeafSectionErrors, LEAF_SECTIONS } from './survey-store-validation'
import { createSyncActions } from './survey-store-sync'
import type { SurveyState } from './survey-store-types'

export type { SurveyState } from './survey-store-types'

/**
 * Mobile site-survey draft state.
 *
 * Split out of a single 883-line file. What remains here is the store wiring
 * and the synchronous edits (form fields, areas, hazards, photos). The pieces
 * that stand alone moved to siblings:
 *
 *   survey-store-types.ts       the SurveyState contract
 *   survey-store-helpers.ts     pure array helpers and the guarded write
 *   survey-store-validation.ts  per-section rules, as functions over form data
 *   survey-store-sync.ts        everything that talks to the database
 *
 * No behavior change: the same declarations, moved and exported.
 */
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
      pendingSubmit: false,
      baseUpdatedAt: null,
      hasConflict: false,
      sectionValidation: initialSectionValidation,

      // Basic setters
      setCurrentSurveyId: (id) => set({ currentSurveyId: id }),
      setCustomerId: (id) => set({ customerId: id }),
      setOrganizationId: (id) => set({ organizationId: id }),
      setCurrentSection: (section) => set({ currentSection: section }),
      setPendingSubmit: (pending) => set({ pendingSubmit: pending }),

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
            // Also remove from any area photo_ids: only touches areas that reference this photo
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
          pendingSubmit: false,
          baseUpdatedAt: null,
          hasConflict: false,
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
      // ============================================
      // Database sync
      // ============================================
      ...createSyncActions(set, get),

      // ============================================
      // Validation
      // ============================================
      validateSection: (section) => {
        const state = get()

        // 'review' means "every other section passes". It is evaluated by
        // calling back through the store rather than with a pure helper,
        // because each of those calls also records its own result in
        // sectionValidation, which is what the step indicators read. A pure
        // check here would leave those entries stale.
        const errors =
          section === 'review'
            ? LEAF_SECTIONS.every((s) => state.validateSection(s).isValid)
              ? []
              : ['Please complete all required sections']
            : collectLeafSectionErrors(state.formData, section)

        const result = { isValid: errors.length === 0, errors }

        // Only write back when the result actually changed. See isSameValidation
        // for why: an unconditional write turns any render-time validation call
        // into an infinite re-render loop.
        if (!isSameValidation(state.sectionValidation[section], result)) {
          set((current) => ({
            sectionValidation: { ...current.sectionValidation, [section]: result },
          }))
        }
        return result
      },

      validateAll: () => {
        const state = get()
        return LEAF_SECTIONS.every((s) => state.validateSection(s).isValid)
      },
    }),
    {
      name: 'hazardos-survey-draft',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Strip the heavy image payloads off each photo before writing to
        // localStorage. A single 1–2MB base64 dataUrl × ~10 photos easily
        // blows past the 5–10MB per-origin quota on mobile Safari, at which
        // point setItem throws QuotaExceededError, the persisted state goes
        // stale, and subsequent re-renders see inconsistent data, one of
        // the root causes of the blank-white-on-return bug.
        //
        // The photo-queue-store + IndexedDB (photo-blob-store) keep the actual
        // bytes for delivery; survey-store only needs the metadata for
        // validation and review display.
        const strippedPhotos = state.formData.photos.photos.map((p) => ({
          ...p,
          blob: null,
          dataUrl: null,
        }))
        return {
          currentSurveyId: state.currentSurveyId,
          customerId: state.customerId,
          organizationId: state.organizationId,
          formData: {
            ...state.formData,
            photos: { photos: strippedPhotos },
          },
          currentSection: state.currentSection,
          startedAt: state.startedAt,
          lastSavedAt: state.lastSavedAt,
          baseUpdatedAt: state.baseUpdatedAt,
          pendingSubmit: state.pendingSubmit,
        }
      },
    }
  )
)

