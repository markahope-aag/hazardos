import { createClient } from '@/lib/supabase/server'
import type { JobCrew, AssignCrewInput, ClockInOutInput } from '@/types/jobs'

export class JobCrewService {
  static async assign(input: AssignCrewInput): Promise<JobCrew> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('job_crew')
      .insert({
        job_id: input.job_id,
        profile_id: input.profile_id,
        role: input.role || 'crew',
        is_lead: input.is_lead || false,
        scheduled_start: input.scheduled_start,
        scheduled_end: input.scheduled_end,
      })
      .select(`
        *,
        profile:profiles(id, full_name, email, phone, avatar_url)
      `)
      .single()

    if (error) throw error
    return data
  }

  static async remove(jobId: string, profileId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('job_crew')
      .delete()
      .eq('job_id', jobId)
      .eq('profile_id', profileId)

    if (error) throw error
  }

  static async update(crewId: string, updates: Partial<JobCrew>): Promise<JobCrew> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('job_crew')
      .update(updates)
      .eq('id', crewId)
      .select(`
        *,
        profile:profiles(id, full_name, email, phone, avatar_url)
      `)
      .single()

    if (error) throw error
    return data
  }

  static async clockInOut(input: ClockInOutInput): Promise<JobCrew> {
    const supabase = await createClient()

    const timestamp = input.timestamp || new Date().toISOString()

    const updates = input.action === 'clock_in'
      ? { clock_in_at: timestamp }
      : { clock_out_at: timestamp }

    const { data, error } = await supabase
      .from('job_crew')
      .update(updates)
      .eq('id', input.job_crew_id)
      .select(`
        *,
        profile:profiles(id, full_name, email, phone, avatar_url)
      `)
      .single()

    if (error) throw error
    return data
  }

  static async getAvailable(date: string): Promise<Array<{
    id: string
    full_name: string
    email: string
    role: string
    is_available: boolean
  }>> {
    const supabase = await createClient()

    // Get all crew members
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['technician', 'estimator', 'admin', 'tenant_owner'])

    // Get jobs on this date
    const { data: jobs } = await supabase
      .from('jobs')
      .select('crew:job_crew(profile_id)')
      .eq('scheduled_start_date', date)
      .neq('status', 'cancelled')

    const assignedIds = new Set(
      jobs?.flatMap(j => (j.crew as { profile_id: string }[])?.map(c => c.profile_id) || [])
    )

    return profiles?.map(p => ({
      ...p,
      is_available: !assignedIds.has(p.id),
    })) || []
  }
}
