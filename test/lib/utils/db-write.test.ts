import { describe, it, expect } from 'vitest'
import { assertWriteOk, assertRowsAffected } from '@/lib/utils/db-write'

describe('assertWriteOk', () => {
  it('returns the data when there is no error', () => {
    expect(assertWriteOk({ data: [{ id: '1' }], error: null }, 'ctx')).toEqual([{ id: '1' }])
  })

  it('throws when the write returned an error, naming the context', () => {
    expect(() =>
      assertWriteOk({ data: null, error: { message: 'permission denied' } }, 'update x'),
    ).toThrow(/update x failed: permission denied/)
  })

  it('composes message, details and hint', () => {
    expect(() =>
      assertWriteOk(
        { data: null, error: { message: 'boom', details: 'row 3', hint: 'try again' } },
        'ctx',
      ),
    ).toThrow(/boom — row 3 — try again/)
  })

  it('falls back to the error code when there is no message', () => {
    expect(() => assertWriteOk({ data: null, error: { code: '23505' } }, 'ctx')).toThrow(/ctx failed: 23505/)
  })
})

describe('assertRowsAffected', () => {
  it('returns the rows when at least one matched', () => {
    expect(assertRowsAffected({ data: [{ id: '1' }], error: null }, 'ctx')).toEqual([{ id: '1' }])
  })

  it('throws when the update matched no rows', () => {
    // The silent-success case: no error, but the target row did not exist, so
    // under the anon client this looked like success while nothing changed.
    expect(() => assertRowsAffected({ data: [], error: null }, 'update by sid')).toThrow(
      /update by sid matched no rows/,
    )
  })

  it('throws when data is null', () => {
    expect(() => assertRowsAffected({ data: null, error: null }, 'ctx')).toThrow(/matched no rows/)
  })

  it('still throws on an actual error', () => {
    expect(() => assertRowsAffected({ data: null, error: { message: 'nope' } }, 'ctx')).toThrow(
      /ctx failed: nope/,
    )
  })
})
