import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import type {
  JobTimeEntry,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
} from '@/types/job-completion'

export class JobTimeEntriesService {
  static async getTimeEntries(jobId: string): Promise<JobTimeEntry[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('job_time_entries')
      .select(`
        *,
        profile:profiles!job_time_entries_profile_id_fkey(id, full_name, email),
        creator:profiles!job_time_entries_created_by_fkey(id, full_name)
      `)
      .eq('job_id', jobId)
      .order('work_date', { ascending: false })

    if (error) throwDbError(error, 'fetch time entries')

    return (data || []).map(entry => ({
      ...entry,
      profile: Array.isArray(entry.profile) ? entry.profile[0] : entry.profile,
      creator: Array.isArray(entry.creator) ? entry.creator[0] : entry.creator,
    }))
  }

  static async createTimeEntry(
    input: CreateTimeEntryInput,
    updateVariance: (jobId: string) => Promise<void>,
  ): Promise<JobTimeEntry> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('job_time_entries')
      .insert({
        job_id: input.job_id,
        profile_id: input.profile_id || user.id,
        work_date: input.work_date,
        hours: input.hours,
        work_type: input.work_type || 'regular',
        hourly_rate: input.hourly_rate,
        billable: input.billable ?? true,
        description: input.description,
        notes: input.notes,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throwDbError(error, 'create time entry')

    await updateVariance(input.job_id)
    await Activity.created('time_entry', data.id, `${input.hours} hours`)

    return data
  }

  static async updateTimeEntry(
    id: string,
    input: UpdateTimeEntryInput,
    updateVariance: (jobId: string) => Promise<void>,
  ): Promise<JobTimeEntry> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('job_time_entries')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throwDbError(error, 'update time entry')

    await updateVariance(data.job_id)
    await Activity.updated('time_entry', data.id)

    return data
  }

  static async deleteTimeEntry(
    id: string,
    updateVariance: (jobId: string) => Promise<void>,
  ): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: entry } = await supabase
      .from('job_time_entries')
      .select('job_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('job_time_entries')
      .delete()
      .eq('id', id)

    if (error) throwDbError(error, 'delete time entry')

    if (entry) {
      await updateVariance(entry.job_id)
    }

    await Activity.deleted('time_entry', id)
  }
}
