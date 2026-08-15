// Technician time clock — see supabase/migrations/20260815000003_time_clock.sql
// and docs/client-feedback-2026-07-28.md P4 #18.

export type TimeClockEntryStatus = 'open' | 'submitted' | 'approved' | 'rejected'

export interface TimeClockEntry {
  id: string
  organization_id: string
  profile_id: string
  job_id: string | null
  clock_in: string
  clock_out: string | null
  status: TimeClockEntryStatus
  notes: string | null
  submitted_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string

  // Relations, populated where useful
  job?: { id: string; job_number: string; name: string | null } | null
  profile?: { id: string; first_name: string | null; last_name: string | null; full_name: string | null } | null
}

export interface ClockInInput {
  job_id?: string | null
  notes?: string | null
}
