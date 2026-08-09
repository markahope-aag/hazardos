import type { StoreApi } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import { createServiceLogger, formatError } from '@/lib/utils/logger'
import { DEFAULT_SURVEY_FORM_DATA } from './survey-types'
import { mapStoreToDb, mapDbToStore, createInitialDbRecord } from './survey-mappers'
import { guardedSurveyUpdate } from './survey-store-helpers'
import { CONFLICT_MESSAGE, type SurveyState, type SurveySyncActions } from './survey-store-types'

const log = createServiceLogger('SurveyStore')

type Set = StoreApi<SurveyState>['setState']
type Get = StoreApi<SurveyState>['getState']

/**
 * Everything that talks to the database, split out of survey-store.ts.
 *
 * These are the actions where the app is least in control: the device may be
 * offline, and another device may have changed the same survey. Both cases are
 * handled here rather than in the UI, and both are load-bearing:
 *
 *   - offline saves deliberately keep `isDirty` true, because the reconnect
 *     sync gates on it. Clearing it made an offline auto-save silently suppress
 *     the reconnect push and the edits never left the device.
 *   - every write is version-gated on `baseUpdatedAt`, so a survey edited on two
 *     devices surfaces a conflict instead of one device silently overwriting
 *     the other.
 */
export function createSyncActions(set: Set, get: Get): SurveySyncActions {
  return {
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
          .select('id, updated_at')
          .single()

        if (error) throwDbError(error, 'create survey')

        set({
          currentSurveyId: data.id,
          baseUpdatedAt: data.updated_at,
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

        if (error) throwDbError(error, 'fetch survey')

        const storeData = mapDbToStore(data)

        set({
          currentSurveyId: storeData.currentSurveyId || surveyId,
          customerId: storeData.customerId || null,
          formData: storeData.formData || DEFAULT_SURVEY_FORM_DATA,
          startedAt: storeData.startedAt || null,
          isDirty: false,
          isSyncing: false,
          lastSavedAt: data.updated_at,
          baseUpdatedAt: data.updated_at,
          hasConflict: false,
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
        // The persist middleware has already written the draft to
        // localStorage, but it is NOT on the server yet. Keep isDirty=true so
        // the reconnect auto-sync (useOnlineSync, which gates on isDirty)
        // actually pushes these edits, and so the X12 conflict check runs,
        // once we're back online. Previously this cleared isDirty, so an
        // offline auto-save silently suppressed the reconnect sync and the
        // edits never left the device. lastSavedAt reflects the local save.
        set({ lastSavedAt: new Date().toISOString() })
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

        const { conflict, newUpdatedAt } = await guardedSurveyUpdate(
          supabase,
          get().currentSurveyId!,
          dbData,
          get().baseUpdatedAt
        )

        if (conflict) {
          set({ isSyncing: false, hasConflict: true, syncError: CONFLICT_MESSAGE })
          log.warn(
            { surveyId: get().currentSurveyId },
            'Draft save conflict: survey changed on another device'
          )
          return false
        }

        set({
          isDirty: false,
          isSyncing: false,
          lastSavedAt: new Date().toISOString(),
          baseUpdatedAt: newUpdatedAt,
          hasConflict: false,
        })
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

        const { conflict, newUpdatedAt } = await guardedSurveyUpdate(
          supabase,
          currentSurveyId,
          dbData,
          get().baseUpdatedAt
        )

        if (conflict) {
          set({ isSyncing: false, hasConflict: true, syncError: CONFLICT_MESSAGE })
          log.warn(
            { surveyId: currentSurveyId },
            'Submit conflict: survey changed on another device'
          )
          return false
        }

        set({ baseUpdatedAt: newUpdatedAt })

        // Best-effort auto-create of a draft estimate. If this fails the
        // survey is still submitted, and the user can retry via the manual
        // "Generate Estimate" flow.
        try {
          const res = await fetch(`/api/site-surveys/${currentSurveyId}/auto-estimate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          })
          if (!res.ok) {
            const detail = await res.text().catch(() => '')
            log.warn(
              { status: res.status, surveyId: currentSurveyId, detail },
              'Auto-estimate creation failed; survey still submitted',
            )
          }
        } catch (estimateError) {
          log.warn(
            { error: formatError(estimateError, 'AUTO_ESTIMATE_ERROR'), surveyId: currentSurveyId },
            'Auto-estimate request errored; survey still submitted',
          )
        }

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
    // Conflict resolution (X12)
    // ============================================
    // Discard this device's unsaved edits and reload the server copy. Reuses
    // loadSurveyFromDb, which resets isDirty, refreshes baseUpdatedAt to the
    // current server version, and clears the conflict flag.
    resolveConflictUseLatest: async () => {
      const surveyId = get().currentSurveyId
      if (!surveyId) return false
      return get().loadSurveyFromDb(surveyId)
    },

    // Keep this device's edits and overwrite the server copy. Forces the
    // write past the version guard (base = null) so it succeeds regardless of
    // the intervening change, then adopts the resulting version as the new base.
    resolveConflictKeepMine: async () => {
      const { currentSurveyId, organizationId } = get()
      if (!currentSurveyId || !organizationId) {
        log.error('Cannot resolve conflict: surveyId and organizationId are required')
        return false
      }

      set({ isSyncing: true, syncError: null })

      try {
        const supabase = createClient()
        const dbData = mapStoreToDb(
          {
            currentSurveyId,
            customerId: get().customerId,
            formData: get().formData,
            startedAt: get().startedAt,
          },
          organizationId,
          { status: 'draft' }
        )

        const { newUpdatedAt } = await guardedSurveyUpdate(supabase, currentSurveyId, dbData, null)

        set({
          isDirty: false,
          isSyncing: false,
          lastSavedAt: new Date().toISOString(),
          baseUpdatedAt: newUpdatedAt,
          hasConflict: false,
        })
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to overwrite survey'
        set({ isSyncing: false, syncError: message })
        log.error(
          { error: formatError(error, 'CONFLICT_KEEP_MINE_ERROR') },
          'Keep-mine resolution error'
        )
        return false
      }
    },
  }
}
