import { nanoid } from 'nanoid'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import type { SurveySection } from './survey-types'
import type { SectionValidation, SupabaseLike } from './survey-store-types'

/**
 * Pure helpers and the one guarded write, split out of survey-store.ts. Nothing
 * here touches the store: each function takes what it needs and returns a new
 * value, which is what makes them testable without a Zustand instance.
 */

export const generateId = () => `${Date.now()}-${nanoid(9)}`

/**
 * Optimistic-concurrency write against site_surveys. When `base` is provided,
 * the UPDATE is gated on `updated_at = base`. If the row has moved on (another
 * device saved), zero rows match and we report a conflict rather than
 * overwriting. Passing `base = null` forces the write unconditionally (used by
 * the "keep mine" resolution and by first-time saves that have no base yet).
 * Returns the row's new updated_at so the caller can advance its version.
 */
export async function guardedSurveyUpdate(
  supabase: SupabaseLike,
  surveyId: string,
  dbData: Record<string, unknown>,
  base: string | null
): Promise<{ conflict: boolean; newUpdatedAt: string | null }> {
  let query = supabase.from('site_surveys').update(dbData).eq('id', surveyId)
  if (base) {
    query = query.eq('updated_at', base)
  }

  const { data, error } = await query.select('updated_at')

  if (error) throwDbError(error, 'update survey')

  if (!data || data.length === 0) {
    return { conflict: true, newUpdatedAt: null }
  }

  return { conflict: false, newUpdatedAt: (data[0] as { updated_at: string }).updated_at }
}

// O(1) index helpers: build a map once, mutate by key, convert back to array
export function updateInArray<T extends { id: string }>(
  items: T[],
  id: string,
  updater: (item: T) => T
): T[] {
  const idx = items.findIndex((item) => item.id === id)
  if (idx === -1) return items
  const result = items.slice()
  result[idx] = updater(items[idx])
  return result
}

export function removeFromArray<T extends { id: string }>(items: T[], id: string): T[] {
  const idx = items.findIndex((item) => item.id === id)
  if (idx === -1) return items
  const result = items.slice()
  result.splice(idx, 1)
  return result
}

export const initialSectionValidation: Record<SurveySection, SectionValidation> = {
  property: { isValid: false, errors: [] },
  access: { isValid: false, errors: [] },
  environment: { isValid: false, errors: [] },
  hazards: { isValid: false, errors: [] },
  photos: { isValid: false, errors: [] },
  review: { isValid: false, errors: [] },
}

/**
 * True when two validation results are equivalent.
 *
 * The store only writes `sectionValidation` when this returns false. Without
 * that guard, any component reading the store during render (the review section
 * calls `validateAll()` in its render body) produces a fresh object every time,
 * Zustand notifies subscribers, they re-render, they validate again, and the
 * loop never terminates. On Chrome that presents as the "Aw, Snap!" renderer
 * crash rather than anything that looks like a validation bug.
 */
export function isSameValidation(
  a: SectionValidation | undefined,
  b: SectionValidation
): boolean {
  return (
    !!a &&
    a.isValid === b.isValid &&
    a.errors.length === b.errors.length &&
    a.errors.every((e, i) => e === b.errors[i])
  )
}
