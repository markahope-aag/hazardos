/**
 * Parse a date-only value as local midnight rather than UTC midnight.
 *
 * `new Date('2026-08-08')` is specified to parse as UTC. In any timezone west
 * of Greenwich that Date is the previous evening in local terms, so calling
 * `setHours`, `getDate` or `toLocaleDateString` on it reports the day before.
 *
 * That is not a cosmetic difference. A `date` column in Postgres arrives as
 * 'YYYY-MM-DD' with no timezone, and every US user is at a negative offset, so
 * anything scheduled or displayed off the naive parse lands one day early.
 *
 * Accepts a full timestamp too and keeps only the date part, so callers do not
 * have to know which shape the column returned.
 */
export function parseLocalDate(value: string): Date {
  const [datePart] = value.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
