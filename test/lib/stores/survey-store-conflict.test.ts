import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Coverage for the X12 optimistic-concurrency guard in the survey store:
 * when the same survey is edited on two devices, the second save must NOT
 * silently overwrite the first. saveDraft/submitSurvey gate their UPDATE on
 * site_surveys.updated_at (the value the device loaded); if the row moved on,
 * the update matches zero rows and the store raises a conflict instead of
 * clobbering. resolveConflictKeepMine forces the write past the guard.
 *
 * The Supabase client is mocked with a chainable builder whose terminal
 * `.select('updated_at')` resolves to a controllable result — `[]` simulates
 * "row changed on another device" (conflict), a row simulates success.
 */

const result = vi.hoisted(() => ({ current: { data: [] as unknown, error: null as unknown } }))

vi.mock('@/lib/supabase/client', () => {
  const makeBuilder = () => {
    const builder: Record<string, unknown> = {}
    builder.update = vi.fn(() => builder)
    builder.insert = vi.fn(() => builder)
    builder.eq = vi.fn(() => builder)
    builder.select = vi.fn(() => Promise.resolve(result.current))
    return builder
  }
  return { createClient: () => ({ from: () => makeBuilder() }) }
})

vi.mock('@/lib/utils/logger', () => ({
  createServiceLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  formatError: (e: unknown) => String(e),
}))

import { useSurveyStore } from '@/lib/stores/survey-store'

const CONFLICT_MESSAGE =
  'This survey was changed on another device. Choose which version to keep.'

function seedActiveDraft() {
  useSurveyStore.setState({
    currentSurveyId: 'survey-1',
    organizationId: 'org-1',
    customerId: null,
    baseUpdatedAt: 'v1',
    isDirty: true,
    hasConflict: false,
    syncError: null,
    startedAt: new Date('2026-07-13T00:00:00Z').toISOString(),
  })
}

describe('survey store — X12 conflict handling', () => {
  beforeEach(() => {
    useSurveyStore.getState().resetSurvey()
    result.current = { data: [], error: null }
  })

  it('flags a conflict and does NOT clear dirty when the server row changed', async () => {
    seedActiveDraft()
    result.current = { data: [], error: null } // guarded update matched zero rows

    const ok = await useSurveyStore.getState().saveDraft()

    expect(ok).toBe(false)
    const s = useSurveyStore.getState()
    expect(s.hasConflict).toBe(true)
    expect(s.syncError).toBe(CONFLICT_MESSAGE)
    expect(s.isDirty).toBe(true) // edits preserved for the user to resolve
    expect(s.baseUpdatedAt).toBe('v1') // version not advanced on conflict
  })

  it('advances the version and clears dirty on a successful guarded save', async () => {
    seedActiveDraft()
    result.current = { data: [{ updated_at: 'v2' }], error: null }

    const ok = await useSurveyStore.getState().saveDraft()

    expect(ok).toBe(true)
    const s = useSurveyStore.getState()
    expect(s.hasConflict).toBe(false)
    expect(s.isDirty).toBe(false)
    expect(s.baseUpdatedAt).toBe('v2')
  })

  it('resolveConflictKeepMine force-writes and adopts the new version', async () => {
    seedActiveDraft()
    useSurveyStore.setState({ hasConflict: true, syncError: CONFLICT_MESSAGE })
    result.current = { data: [{ updated_at: 'v9' }], error: null }

    const ok = await useSurveyStore.getState().resolveConflictKeepMine()

    expect(ok).toBe(true)
    const s = useSurveyStore.getState()
    expect(s.hasConflict).toBe(false)
    expect(s.isDirty).toBe(false)
    expect(s.baseUpdatedAt).toBe('v9')
  })
})
