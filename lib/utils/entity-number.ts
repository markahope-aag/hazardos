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

// Minimal shape of the supabase client methods this helper needs — avoids a
// hard dependency on the generated Database types at this layer.
interface CountableInsertable {
  from(table: string): {
    select(cols: string, opts: { count: 'exact'; head: true }): {
      eq(col: string, val: string): Promise<{ count: number | null }>
    }
    insert(row: Record<string, unknown>): {
      select(): { single(): Promise<{ data: unknown; error: { code?: string; message?: string } | null }> }
    }
  }
}

/**
 * Allocate a sequential per-org entity number (EST-/INV-/JOB-#####) and insert
 * the row atomically-enough to survive concurrency.
 *
 * The historical `count(*) + 1` pattern races: two concurrent requests read the
 * same count and mint the same number. Paired with a UNIQUE index on
 * (organization_id, <number column>) — see migration
 * 20260720000004_v1_entity_number_unique.sql — the loser's insert fails with
 * 23505 and we retry with the next number. Without that index this still works
 * (it simply never sees a conflict), so the migration and this helper ship
 * together but the index can be applied on its own schedule after de-duping.
 */
export async function insertWithEntityNumber<T = unknown>(
  supabase: CountableInsertable,
  opts: {
    table: string
    organizationId: string
    prefix: string
    /** Build the insert row given the freshly-allocated number. */
    buildRow: (entityNumber: string) => Record<string, unknown>
    maxRetries?: number
  },
): Promise<{ data: T | null; error: { code?: string; message?: string } | null }> {
  const { table, organizationId, prefix, buildRow, maxRetries = 5 } = opts
  let lastError: { code?: string; message?: string } | null = null
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
    // Nudge past a number we already lost a race for on the previous attempt.
    const entityNumber = `${prefix}-${String((count || 0) + 1 + attempt).padStart(5, '0')}`
    const { data, error } = await supabase.from(table).insert(buildRow(entityNumber)).select().single()
    if (!error) return { data: data as T, error: null }
    lastError = error
    // Only a uniqueness conflict is retryable; anything else is a real failure.
    if (error.code !== '23505') return { data: null, error }
  }
  return { data: null, error: lastError ?? { code: '23505', message: 'could not allocate unique entity number' } }
}
