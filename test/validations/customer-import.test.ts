import { describe, it, expect } from 'vitest'
import {
  parseImportRow,
  autoMapHeaders,
  IMPORT_FIELDS,
} from '@/lib/validations/customer-import'

describe('parseImportRow', () => {
  it('accepts a minimal row (first name only)', () => {
    const r = parseImportRow({ first_name: 'Ada' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.contact_type).toBe('residential') // defaulted
  })

  it('requires a first name', () => {
    expect(parseImportRow({ last_name: 'Lovelace' }).success).toBe(false)
    expect(parseImportRow({ first_name: '   ' }).success).toBe(false)
  })

  it('treats blank optional cells as absent, not errors', () => {
    const r = parseImportRow({
      first_name: 'Ada', last_name: '', email: '', mobile_phone: '', title: '',
    })
    expect(r.success).toBe(true)
    if (r.success) { expect(r.data.last_name).toBeUndefined(); expect(r.data.email).toBeUndefined() }
  })

  it('validates and lowercases email when present', () => {
    const ok = parseImportRow({ first_name: 'Ada', email: 'ADA@Example.COM' })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.email).toBe('ada@example.com')
    expect(parseImportRow({ first_name: 'Ada', email: 'not-an-email' }).success).toBe(false)
  })

  it('coerces free-text contact type to the enum', () => {
    const cases: Array<[string, string]> = [
      ['Commercial', 'commercial'], ['business', 'commercial'], ['C', 'commercial'],
      ['Residential', 'residential'], ['home', 'residential'], ['anything', 'residential'],
    ]
    for (const [input, expected] of cases) {
      const r = parseImportRow({ first_name: 'X', contact_type: input })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.contact_type).toBe(expected)
    }
  })

  it('trims whitespace on values', () => {
    const r = parseImportRow({ first_name: '  Ada  ', title: '  CEO  ' })
    expect(r.success).toBe(true)
    if (r.success) { expect(r.data.first_name).toBe('Ada'); expect(r.data.title).toBe('CEO') }
  })
})

describe('parseImportRow edge inputs (EX11)', () => {
  it('accepts emoji in names', () => {
    const r = parseImportRow({ first_name: 'Ada 👷', last_name: '🏗️ Lovelace' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.first_name).toBe('Ada 👷')
      expect(r.data.last_name).toBe('🏗️ Lovelace')
    }
  })

  it('accepts non-Latin characters (CJK, Arabic, Cyrillic)', () => {
    const cases = ['山田太郎', 'محمد', 'Александр', 'Æøå', 'Ñoño']
    for (const name of cases) {
      const r = parseImportRow({ first_name: name, company_name: `${name} Inc` })
      expect(r.success, `${name} should validate`).toBe(true)
      if (r.success) expect(r.data.first_name).toBe(name)
    }
  })

  it('accepts a company name at the 255 limit but rejects one beyond it', () => {
    expect(parseImportRow({ first_name: 'A', company_name: 'X'.repeat(255) }).success).toBe(true)
    expect(parseImportRow({ first_name: 'A', company_name: 'X'.repeat(256) }).success).toBe(false)
  })

  it('rejects an over-long first name rather than silently truncating', () => {
    const r = parseImportRow({ first_name: 'X'.repeat(101) })
    expect(r.success).toBe(false)
  })

  it('strips a UTF-8 BOM so a BOM-prefixed header still auto-maps', () => {
    // A CSV saved by Excel prefixes the first header with U+FEFF.
    const m = autoMapHeaders(['﻿First Name', 'Email'])
    expect(m.first_name).toBe('﻿First Name') // original header preserved for lookup
    expect(m.email).toBe('Email')
  })
})

describe('autoMapHeaders', () => {
  it('maps common header variants to fields', () => {
    const m = autoMapHeaders(['First Name', 'Last Name', 'Email Address', 'Cell Phone', 'Company'])
    expect(m.first_name).toBe('First Name')
    expect(m.last_name).toBe('Last Name')
    expect(m.email).toBe('Email Address')
    expect(m.mobile_phone).toBe('Cell Phone')
    expect(m.company_name).toBe('Company')
  })

  it('is case- and spacing-insensitive', () => {
    const m = autoMapHeaders(['  FIRSTNAME ', 'e-mail'])
    expect(m.first_name).toBe('  FIRSTNAME ')
    expect(m.email).toBe('e-mail')
  })

  it('leaves unknown headers unmapped and never double-assigns one header', () => {
    const m = autoMapHeaders(['first', 'random_col'])
    expect(m.first_name).toBe('first')
    expect(Object.values(m)).not.toContain('random_col')
    const assigned = Object.values(m)
    expect(new Set(assigned).size).toBe(assigned.length)
  })

  it('every field has a stable key/label', () => {
    for (const f of IMPORT_FIELDS) { expect(f.key).toBeTruthy(); expect(f.label).toBeTruthy() }
  })
})
