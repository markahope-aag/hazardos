import { describe, it, expect } from 'vitest'
import {
  suggestExpiry,
  requiredForSummary,
  credentialCategoryLabel,
  containmentLabel,
  hazardLabel,
} from '@/lib/credentials/vocab'

describe('suggestExpiry', () => {
  it('adds the validity window to the issue date in whole UTC days', () => {
    expect(suggestExpiry('2026-01-01', 365)).toBe('2027-01-01')
    expect(suggestExpiry('2026-01-01', 30)).toBe('2026-01-31')
  })

  it('rolls over months and leap years correctly', () => {
    expect(suggestExpiry('2024-02-28', 1)).toBe('2024-02-29') // leap year
    expect(suggestExpiry('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('returns empty string when inputs are missing or non-positive', () => {
    expect(suggestExpiry('', 365)).toBe('')
    expect(suggestExpiry(null, 365)).toBe('')
    expect(suggestExpiry('2026-01-01', null)).toBe('')
    expect(suggestExpiry('2026-01-01', 0)).toBe('')
    expect(suggestExpiry('2026-01-01', -10)).toBe('')
  })

  it('returns empty string for an unparseable date', () => {
    expect(suggestExpiry('not-a-date', 30)).toBe('')
  })
})

describe('label helpers', () => {
  it('maps known enum values to friendly labels', () => {
    expect(credentialCategoryLabel('rrp_certification')).toBe('RRP certification')
    expect(containmentLabel('type_ii')).toBe('Type II')
    expect(hazardLabel('asbestos')).toBe('Asbestos')
  })

  it('falls back to the raw value when unknown', () => {
    expect(credentialCategoryLabel('mystery')).toBe('mystery')
    expect(containmentLabel('type_iv')).toBe('type_iv')
  })
})

describe('requiredForSummary', () => {
  it('joins containment levels and hazard types with a separator', () => {
    expect(requiredForSummary(['type_iii'], ['asbestos'])).toBe('Type III · Asbestos')
  })

  it('handles containment-only, hazard-only, and empty cases', () => {
    expect(requiredForSummary(['type_i', 'type_ii'], null)).toBe('Type I, Type II')
    expect(requiredForSummary(null, ['lead', 'mold'])).toBe('Lead, Mold')
    expect(requiredForSummary(null, null)).toBe('')
    expect(requiredForSummary([], [])).toBe('')
  })
})
