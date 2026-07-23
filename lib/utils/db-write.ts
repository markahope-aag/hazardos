/**
 * Guards against the "silent success" class of bug this codebase repeatedly hit:
 * a Supabase write whose `error` is never checked (and, under the anon client in
 * a sessionless context, whose RLS quietly matches zero rows), so the caller
 * reports success while nothing happened.
 *
 * Throwing is the point. In a webhook that turns into a 5xx, so Stripe/Twilio
 * retry instead of the event being lost; in a cron it surfaces as a failed run
 * in cron_runs instead of a green "sent: 0". The two callers that must NOT fail
 * the whole request on one bad write (best-effort notifications, view tracking)
 * should catch it locally rather than skip the check.
 */

interface WriteError {
  message?: string
  code?: string
  details?: string
  hint?: string
}

interface WriteResult<T> {
  data: T
  error: WriteError | null
}

/**
 * Throw if a Supabase write returned an error; otherwise return its data.
 *
 *   const row = assertWriteOk(
 *     await supabase.from('x').update(...).eq('id', id).select().single(),
 *     'update x',
 *   )
 */
export function assertWriteOk<T>(result: WriteResult<T>, context: string): T {
  if (result.error) {
    const parts = [result.error.message, result.error.details, result.error.hint]
      .filter(Boolean)
      .join(' — ')
    throw new Error(`${context} failed: ${parts || result.error.code || 'unknown database error'}`)
  }
  return result.data
}

/**
 * Like assertWriteOk, but also fails when the write matched no rows. Use for an
 * UPDATE keyed on something expected to exist (a message SID, a subscription id)
 * where "matched nothing" is a real failure the anon client used to hide. The
 * query must include `.select()` so the affected rows come back.
 */
export function assertRowsAffected<T>(
  result: WriteResult<T[] | null>,
  context: string,
): T[] {
  const rows = assertWriteOk(result, context)
  if (!rows || rows.length === 0) {
    throw new Error(`${context} matched no rows`)
  }
  return rows
}
