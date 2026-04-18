// Jobs and estimates share a human-readable numbering convention:
//   JOB-<street-number>-<mmddyyyy>  (no zero padding)
//   EST-<street-number>-<mmddyyyy>
//
// e.g. a job at "201 Oakdale" scheduled April 6, 2026 is `JOB-201-462026`.
// The label encodes the two pieces of information people reach for most
// — "which address, which day" — so it stays legible without looking the
// record up. Uniqueness is enforced per-org by the caller via a suffix
// (-2, -3, …) on collision.
//
// Fallbacks are deliberate:
//   - no leading digits in the address → 'X' slot rather than failing
//   - no date provided → today, so the label is still well-formed the
//     moment the record is created and can be edited later if needed

export function buildEntityNumberBase(
  prefix: string,
  address: string | null | undefined,
  dateStr: string | null | undefined,
): string {
  const streetMatch = (address || '').trim().match(/^(\d+)/)
  const streetPart = streetMatch ? streetMatch[1] : 'X'

  let y: number, m: number, d: number
  if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    // Parse the YYYY-MM-DD string literally — constructing `new Date(str)`
    // for a date-only ISO shifts by the UTC offset and can report the day
    // before in US timezones.
    const parts = dateStr.split('-')
    y = parseInt(parts[0], 10)
    m = parseInt(parts[1], 10)
    d = parseInt(parts[2], 10)
  } else {
    const now = new Date()
    y = now.getFullYear()
    m = now.getMonth() + 1
    d = now.getDate()
  }

  return `${prefix}-${streetPart}-${m}${d}${y}`
}

export function withUniqueSuffix(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}
