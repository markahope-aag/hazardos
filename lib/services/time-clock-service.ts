import { createClient } from '@/lib/supabase/server'
import { throwDbError, SecureError } from '@/lib/utils/secure-error-handler'
import type { ClockInInput, TimeClockEntry, TimeClockEntryStatus } from '@/types/time-clock'

const ENTRY_COLUMNS = `
  id, organization_id, profile_id, job_id, clock_in, clock_out, status, notes,
  submitted_at, reviewed_by, reviewed_at, review_notes, created_at, updated_at,
  job:jobs(id, job_number, name),
  profile:profiles!profile_id(id, first_name, last_name, full_name)
`

function unwrapRelations(row: Record<string, unknown>): TimeClockEntry {
  return {
    ...row,
    job: Array.isArray(row.job) ? row.job[0] ?? null : row.job ?? null,
    profile: Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile ?? null,
  } as TimeClockEntry
}

export class TimeClockService {
  /**
   * Starts a new open entry. Blocked by time_clock_entries_one_open_per_profile
   * (a partial unique index on profile_id where clock_out is null) if the
   * technician is already clocked in somewhere — that's a real risk on a
   * phone in a work glove, not a hypothetical.
   */
  static async clockIn(
    organizationId: string,
    profileId: string,
    input: ClockInInput = {},
  ): Promise<TimeClockEntry> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('time_clock_entries')
      .insert({
        organization_id: organizationId,
        profile_id: profileId,
        job_id: input.job_id || null,
        clock_in: new Date().toISOString(),
        notes: input.notes || null,
      })
      .select(ENTRY_COLUMNS)
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new SecureError('VALIDATION_ERROR', 'Already clocked in — clock out first.')
      }
      throwDbError(error, 'clock in')
    }
    return unwrapRelations(data)
  }

  /** Clocks out the caller's own open entry. Scoped by profileId — not just entryId — so one technician cannot close another's clock. */
  static async clockOut(entryId: string, profileId: string): Promise<TimeClockEntry> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('time_clock_entries')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', entryId)
      .eq('profile_id', profileId)
      .is('clock_out', null)
      .select(ENTRY_COLUMNS)
      .maybeSingle()

    if (error) throwDbError(error, 'clock out')
    if (!data) throw new SecureError('NOT_FOUND', 'No open entry to clock out of')
    return unwrapRelations(data)
  }

  /** The caller's own entries in a date range (inclusive), newest first. */
  static async listMine(
    profileId: string,
    range?: { from: string; to: string },
  ): Promise<TimeClockEntry[]> {
    const supabase = await createClient()

    let query = supabase
      .from('time_clock_entries')
      .select(ENTRY_COLUMNS)
      .eq('profile_id', profileId)
      .order('clock_in', { ascending: false })

    if (range) {
      query = query.gte('clock_in', range.from).lte('clock_in', range.to)
    }

    const { data, error } = await query
    if (error) throwDbError(error, 'list time clock entries')
    return (data ?? []).map(unwrapRelations)
  }

  /**
   * Submits every closed, not-yet-submitted entry in the range. Refuses if
   * any entry in the range is still open (clocked in, not out) — submitting
   * a week with a live clock running would freeze a total that's still
   * changing.
   */
  static async submitRange(
    organizationId: string,
    profileId: string,
    range: { from: string; to: string },
  ): Promise<{ submitted: number }> {
    const supabase = await createClient()

    const { count: openCount, error: openError } = await supabase
      .from('time_clock_entries')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('profile_id', profileId)
      .gte('clock_in', range.from)
      .lte('clock_in', range.to)
      .is('clock_out', null)

    if (openError) throwDbError(openError, 'check open entries before submit')
    if ((openCount ?? 0) > 0) {
      throw new SecureError('VALIDATION_ERROR', 'Clock out of every entry in this range before submitting it.')
    }

    const { data, error } = await supabase
      .from('time_clock_entries')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('profile_id', profileId)
      .eq('status', 'open')
      .gte('clock_in', range.from)
      .lte('clock_in', range.to)
      .select('id')

    if (error) throwDbError(error, 'submit time clock entries')
    return { submitted: data?.length ?? 0 }
  }

  /** Org-wide entries awaiting supervisor review. */
  static async listSubmitted(organizationId: string): Promise<TimeClockEntry[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('time_clock_entries')
      .select(ENTRY_COLUMNS)
      .eq('organization_id', organizationId)
      .eq('status', 'submitted')
      .order('clock_in', { ascending: true })

    if (error) throwDbError(error, 'list submitted time clock entries')
    return (data ?? []).map(unwrapRelations)
  }

  /** Approves or rejects a batch of submitted entries in one action — a supervisor reviews a technician's week, not one clock-in at a time. */
  static async review(
    organizationId: string,
    entryIds: string[],
    reviewerId: string,
    decision: Extract<TimeClockEntryStatus, 'approved' | 'rejected'>,
    reviewNotes?: string | null,
  ): Promise<{ updated: number }> {
    if (entryIds.length === 0) return { updated: 0 }
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('time_clock_entries')
      .update({
        status: decision,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq('organization_id', organizationId)
      .eq('status', 'submitted')
      .in('id', entryIds)
      .select('id')

    if (error) throwDbError(error, `${decision === 'approved' ? 'approve' : 'reject'} time clock entries`)
    return { updated: data?.length ?? 0 }
  }
}
