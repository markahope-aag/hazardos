import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteObject, isR2Configured } from '@/lib/storage/r2'
import { createServiceLogger } from '@/lib/utils/logger'

const log = createServiceLogger('photo-lifecycle')

const SUPABASE_BUCKET = 'survey-photos'

// One run handles at most this many rows. Two reasons for the cap:
//   • Vercel cron has a 60-second function timeout on the Hobby tier
//     and 5 minutes on Pro — running unbounded could hit it.
//   • A single org with hundreds of expirations on day-1095 would
//     monopolize the run; capping forces a tail to be picked up by
//     the next daily run, but that tail decays fast.
const MAX_DELETIONS_PER_RUN = 500

export interface LifecycleResult {
  scanned: number
  deleted: number
  failed: number
  failures: Array<{ photoId: string; error: string }>
}

/**
 * Hard-delete photos whose `expires_at` has passed. Removes bytes
 * from R2 (and from Supabase Storage for legacy rows that haven't
 * been migrated to R2 yet), then marks the row `tier='deleted'` and
 * nulls every storage path so the row stops referencing absent
 * objects.
 *
 * The row itself is retained as an audit artifact: it preserves the
 * survey-id and the legacy_id, so a later question like "did we ever
 * have a photo for survey X under category Y?" still has an answer.
 *
 * Idempotent — re-running on already-deleted rows is a no-op (the
 * tier filter excludes them). If a single delete throws, the row is
 * skipped, the failure is logged, and the next run retries.
 */
export async function expirePhotos(): Promise<LifecycleResult> {
  const supabase = createAdminClient()

  const { data: rows, error } = await supabase
    .from('survey_photos')
    .select(
      'id, original_r2_key, stamped_r2_key, original_supabase_path, stamped_supabase_path',
    )
    .lt('expires_at', new Date().toISOString())
    .neq('tier', 'deleted')
    .order('expires_at', { ascending: true })
    .limit(MAX_DELETIONS_PER_RUN)

  if (error) {
    log.error({ err: error }, 'Failed to read expired survey_photos rows')
    throw error
  }

  const result: LifecycleResult = {
    scanned: rows?.length ?? 0,
    deleted: 0,
    failed: 0,
    failures: [],
  }

  if (!rows || rows.length === 0) {
    return result
  }

  for (const row of rows) {
    try {
      await deleteAllStorage(row)

      const { error: updateErr } = await supabase
        .from('survey_photos')
        .update({
          tier: 'deleted',
          tier_changed_at: new Date().toISOString(),
          original_r2_key: null,
          stamped_r2_key: null,
          original_supabase_path: null,
          stamped_supabase_path: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      if (updateErr) {
        throw updateErr
      }
      result.deleted += 1
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.failed += 1
      result.failures.push({ photoId: row.id, error: msg })
      log.error(
        { err, photoId: row.id },
        'Failed to expire survey photo — bytes may persist',
      )
    }
  }

  return result
}

/**
 * Best-effort delete across both storage backends. R2 deletes are
 * the steady state; Supabase deletes only matter for legacy rows
 * created before the R2 cutover. Each backend's delete is wrapped in
 * its own try so a 404 (object already gone) on one backend doesn't
 * block the other.
 */
async function deleteAllStorage(row: {
  original_r2_key: string | null
  stamped_r2_key: string | null
  original_supabase_path: string | null
  stamped_supabase_path: string | null
}): Promise<void> {
  const r2Keys = [row.original_r2_key, row.stamped_r2_key].filter(
    (k): k is string => Boolean(k),
  )
  const supabasePaths = [row.original_supabase_path, row.stamped_supabase_path].filter(
    (p): p is string => Boolean(p),
  )

  if (r2Keys.length > 0) {
    if (!isR2Configured()) {
      throw new Error('R2 is not configured but a row references R2 keys')
    }
    for (const key of r2Keys) {
      try {
        await deleteObject(key)
      } catch (err) {
        // 404 means the object is already gone — that's the desired
        // end state, so don't fail the row over it.
        const error = err as { name?: string; $metadata?: { httpStatusCode?: number } }
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
          continue
        }
        throw err
      }
    }
  }

  if (supabasePaths.length > 0) {
    const supabase = createAdminClient()
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove(supabasePaths)
    // Supabase's remove() doesn't error on missing files — it returns
    // an empty data array. Only surface real errors (auth, network).
    if (error) {
      throw error
    }
  }
}
