import { describe, it, expect } from 'vitest'
import {
  shortName,
  shortNameFromFull,
  crewLabel,
  collectContacts,
} from '@/app/(dashboard)/calendar/calendar-types'

describe('shortName', () => {
  it('abbreviates the surname so the person survives a truncated chip', () => {
    expect(shortName('Gina', 'Richardson')).toBe('Gina R.')
  })

  it('returns the first name alone when there is no surname', () => {
    expect(shortName('Gina', null)).toBe('Gina')
  })

  it('returns the surname alone when there is no first name', () => {
    expect(shortName('', 'Richardson')).toBe('Richardson')
  })

  it('returns null when the profile has no name at all', () => {
    expect(shortName(null, undefined)).toBeNull()
  })

  it('ignores whitespace-only names', () => {
    expect(shortName('   ', '  ')).toBeNull()
  })
})

describe('shortNameFromFull', () => {
  it('splits a single full_name column into first and abbreviated last', () => {
    expect(shortNameFromFull('Bob Stigsell')).toBe('Bob S.')
  })

  it('uses the final word when the name has a middle name', () => {
    expect(shortNameFromFull('Melissa Grow Cusumano')).toBe('Melissa C.')
  })

  it('passes a mononym through unchanged', () => {
    expect(shortNameFromFull('Brett')).toBe('Brett')
  })

  it('returns null for an empty name', () => {
    expect(shortNameFromFull('  ')).toBeNull()
  })
})

describe('crewLabel', () => {
  const member = (id: string, full_name: string | null, is_lead = false) => ({
    is_lead,
    profile: { id, full_name },
  })

  it('returns null when nobody is assigned', () => {
    expect(crewLabel([])).toBeNull()
    expect(crewLabel(undefined)).toBeNull()
  })

  it('names a single crew member', () => {
    expect(crewLabel([member('1', 'Brett Kowalski')])).toBe('Brett K.')
  })

  it('leads with the crew lead regardless of row order', () => {
    expect(
      crewLabel([member('1', 'Brett Kowalski'), member('2', 'Gina Richardson', true)]),
    ).toBe('Gina R. +1')
  })

  it('counts the rest rather than overflowing the chip', () => {
    expect(
      crewLabel([
        member('1', 'Gina Richardson', true),
        member('2', 'Brett Kowalski'),
        member('3', 'Bob Stigsell'),
        member('4', 'Chad Hughes'),
      ]),
    ).toBe('Gina R. +3')
  })

  it('skips crew rows whose profile failed to join', () => {
    expect(crewLabel([{ is_lead: true, profile: null }, member('2', 'Brett Kowalski')])).toBe(
      'Brett K.',
    )
  })
})

describe('collectContacts', () => {
  it('drops entries with no phone number', () => {
    expect(collectContacts([{ label: 'Chad Hughes', phone: '' }, null])).toEqual([])
  })

  it('keeps the first label when the same number appears twice', () => {
    expect(
      collectContacts([
        { label: 'Chad Hughes', phone: '(608) 575-4508' },
        { label: 'Hughes Residence', phone: '6085754508' },
      ]),
    ).toEqual([{ label: 'Chad Hughes', phone: '(608) 575-4508' }])
  })

  it('keeps two genuinely different numbers', () => {
    expect(
      collectContacts([
        { label: 'Gina', phone: '608-577-2939' },
        { label: 'Brett', phone: '608-770-6614' },
      ]),
    ).toHaveLength(2)
  })

  it('rejects fragments too short to dial', () => {
    expect(collectContacts([{ label: 'Extension', phone: '209' }])).toEqual([])
  })
})
