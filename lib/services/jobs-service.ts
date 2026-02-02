import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import type {
  Job,
  JobCrew,
  CreateJobInput,
  CreateJobFromProposalInput,
  UpdateJobInput,
  JobStatus,
} from '@/types/jobs'

export class JobsService {
  static async create(input: CreateJobInput): Promise<Job> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    const organizationId = profile.organization_id

    // Generate job number
    const { data: jobNumber } = await supabase
      .rpc('generate_job_number', { org_id: organizationId })

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        organization_id: organizationId,
        job_number: jobNumber,
        customer_id: input.customer_id,
        proposal_id: input.proposal_id,
        name: input.name,
        scheduled_start_date: input.scheduled_start_date,
        scheduled_start_time: input.scheduled_start_time,
        scheduled_end_date: input.scheduled_end_date,
        estimated_duration_hours: input.estimated_duration_hours,
        job_address: input.job_address,
        job_city: input.job_city,
        job_state: input.job_state,
        job_zip: input.job_zip,
        access_notes: input.access_notes,
        special_instructions: input.special_instructions,
        hazard_types: input.hazard_types || [],
        status: 'scheduled',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Schedule customer reminders
    await JobsService.scheduleReminders(data.id)

    // Log activity
    await Activity.created('job', data.id, data.job_number)

    return data
  }

  static async createFromProposal(input: CreateJobFromProposalInput): Promise<Job> {
    const supabase = await createClient()

    // Get proposal with all related data
    const { data: proposal, error: propError } = await supabase
      .from('proposals')
      .select(`
        *,
        customer:customers(*),
        estimate:estimates(
          *,
          site_survey:site_surveys(*)
        )
      `)
      .eq('id', input.proposal_id)
      .single()

    if (propError || !proposal) {
      throw new Error('Proposal not found')
    }

    // Handle nested arrays from Supabase
    const estimate = Array.isArray(proposal.estimate) ? proposal.estimate[0] : proposal.estimate
    const survey = estimate?.site_survey
      ? (Array.isArray(estimate.site_survey) ? estimate.site_survey[0] : estimate.site_survey)
      : null
    const customer = Array.isArray(proposal.customer) ? proposal.customer[0] : proposal.customer

    // Create job with data from proposal
    const job = await JobsService.create({
      proposal_id: input.proposal_id,
      customer_id: proposal.customer_id,
      scheduled_start_date: input.scheduled_start_date,
      scheduled_start_time: input.scheduled_start_time,
      estimated_duration_hours: input.estimated_duration_hours,
      job_address: survey?.site_address || customer?.address_line1 || '',
      job_city: survey?.site_city || customer?.city,
      job_state: survey?.site_state || customer?.state,
      job_zip: survey?.site_zip || customer?.zip,
      access_notes: survey?.access_info?.notes,
      hazard_types: survey?.hazard_type ? [survey.hazard_type] : [],
    })

    // Update job with contract amount and additional details
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        estimate_id: proposal.estimate_id,
        site_survey_id: survey?.id,
        contract_amount: proposal.total,
        final_amount: proposal.total,
        gate_code: survey?.access_info?.gateCode,
        lockbox_code: survey?.access_info?.lockboxCode,
        contact_onsite_name: survey?.access_info?.contactName,
        contact_onsite_phone: survey?.access_info?.contactPhone,
      })
      .eq('id', job.id)

    if (updateError) throw updateError

    // Update proposal status to converted
    await supabase
      .from('proposals')
      .update({ status: 'converted' })
      .eq('id', input.proposal_id)

    return job
  }

  static async getById(id: string): Promise<Job | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*),
        proposal:proposals(id, proposal_number, total),
        estimate:estimates(id, estimate_number),
        site_survey:site_surveys(id),
        crew:job_crew(
          *,
          profile:profiles(id, full_name, email, phone, avatar_url)
        ),
        equipment:job_equipment(*),
        materials:job_materials(*),
        disposal:job_disposal(*),
        change_orders:job_change_orders(*),
        notes:job_notes(
          *,
          author:profiles(id, full_name)
        )
      `)
      .eq('id', id)
      .single()

    if (error) return null

    // Transform nested arrays
    return {
      ...data,
      customer: Array.isArray(data.customer) ? data.customer[0] : data.customer,
      proposal: Array.isArray(data.proposal) ? data.proposal[0] : data.proposal,
      estimate: Array.isArray(data.estimate) ? data.estimate[0] : data.estimate,
      site_survey: Array.isArray(data.site_survey) ? data.site_survey[0] : data.site_survey,
    }
  }

  static async list(filters?: {
    status?: string | string[]
    customer_id?: string
    from_date?: string
    to_date?: string
    crew_member_id?: string
    limit?: number
    offset?: number
  }): Promise<{ jobs: Job[]; total: number; limit: number; offset: number }> {
    const supabase = await createClient()

    const limit = filters?.limit || 50
    const offset = filters?.offset || 0

    let query = supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(id, company_name, name, email),
        crew:job_crew(
          profile_id,
          is_lead,
          profile:profiles(id, full_name)
        )
      `, { count: 'exact' })
      .order('scheduled_start_date', { ascending: true })

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id)
    }

    if (filters?.from_date) {
      query = query.gte('scheduled_start_date', filters.from_date)
    }

    if (filters?.to_date) {
      query = query.lte('scheduled_start_date', filters.to_date)
    }

    // Apply pagination (only if not filtering by crew member, which requires post-filtering)
    if (!filters?.crew_member_id) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data, error, count } = await query
    if (error) throw error

    // Transform and filter
    let jobs = (data || []).map(job => ({
      ...job,
      customer: Array.isArray(job.customer) ? job.customer[0] : job.customer,
    }))

    let total = count || 0

    // Filter by crew member if needed (post-query since it's a nested filter)
    if (filters?.crew_member_id && jobs) {
      jobs = jobs.filter(job =>
        job.crew?.some((c: JobCrew) => c.profile_id === filters.crew_member_id)
      )
      total = jobs.length
      // Apply pagination after filtering
      jobs = jobs.slice(offset, offset + limit)
    }

    return { jobs, total, limit, offset }
  }

  static async getCalendarEvents(start: string, end: string): Promise<Job[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(id, company_name, name),
        crew:job_crew(
          is_lead,
          profile:profiles(id, full_name)
        )
      `)
      .gte('scheduled_start_date', start)
      .lte('scheduled_start_date', end)
      .neq('status', 'cancelled')
      .order('scheduled_start_date', { ascending: true })

    if (error) throw error

    return (data || []).map(job => ({
      ...job,
      customer: Array.isArray(job.customer) ? job.customer[0] : job.customer,
    }))
  }

  static async update(id: string, updates: UpdateJobInput): Promise<Job> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateStatus(id: string, status: JobStatus): Promise<Job> {
    // Get current job to know old status
    const currentJob = await JobsService.getById(id)
    const oldStatus = currentJob?.status

    const updates: Partial<Job> = { status }

    if (status === 'in_progress') {
      updates.actual_start_at = new Date().toISOString()
    } else if (status === 'completed') {
      updates.actual_end_at = new Date().toISOString()
    }

    const updatedJob = await JobsService.update(id, updates as UpdateJobInput)

    // Log activity if status actually changed
    if (oldStatus && oldStatus !== status) {
      await Activity.statusChanged('job', id, updatedJob.job_number, oldStatus, status)
    }

    return updatedJob
  }

  static async delete(id: string): Promise<void> {
    const supabase = await createClient()

    // Cancel reminders first
    await JobsService.cancelReminders(id)

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== REMINDERS ==========

  static async scheduleReminders(jobId: string): Promise<void> {
    const supabase = await createClient()

    const job = await JobsService.getById(jobId)
    if (!job || !job.customer) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', job.created_by)
      .single()

    if (!profile) return

    const scheduledDate = new Date(job.scheduled_start_date)
    const customer = job.customer

    const reminders = [
      { days: 7, type: 'job_7day', template: 'job_reminder_7day' },
      { days: 3, type: 'job_3day', template: 'job_reminder_3day' },
      { days: 1, type: 'job_1day', template: 'job_reminder_1day' },
    ]

    for (const reminder of reminders) {
      const reminderDate = new Date(scheduledDate)
      reminderDate.setDate(reminderDate.getDate() - reminder.days)
      reminderDate.setHours(9, 0, 0, 0) // 9 AM

      // Only schedule if in the future
      if (reminderDate > new Date()) {
        await supabase.from('scheduled_reminders').insert({
          organization_id: profile.organization_id,
          related_type: 'job',
          related_id: jobId,
          reminder_type: reminder.type,
          recipient_type: 'customer',
          recipient_email: customer.email,
          recipient_phone: customer.phone,
          channel: 'email',
          scheduled_for: reminderDate.toISOString(),
          template_slug: reminder.template,
          template_variables: {
            customer_name: customer.name || customer.company_name,
            scheduled_date: job.scheduled_start_date,
            scheduled_time: job.scheduled_start_time,
            property_address: job.job_address,
            job_number: job.job_number,
          },
        })
      }
    }
  }

  static async cancelReminders(jobId: string): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('scheduled_reminders')
      .update({ status: 'cancelled' })
      .eq('related_type', 'job')
      .eq('related_id', jobId)
      .eq('status', 'pending')
  }

  static async rescheduleReminders(jobId: string): Promise<void> {
    await JobsService.cancelReminders(jobId)
    await JobsService.scheduleReminders(jobId)
  }

  // ========== BACKWARD COMPATIBILITY ==========
  // These methods delegate to the new services for backward compatibility
  // They can be removed once all callers are updated

  static async assignCrew(...args: Parameters<typeof import('./job-crew-service').JobCrewService.assign>) {
    const { JobCrewService } = await import('./job-crew-service')
    return JobCrewService.assign(...args)
  }

  static async removeCrew(...args: Parameters<typeof import('./job-crew-service').JobCrewService.remove>) {
    const { JobCrewService } = await import('./job-crew-service')
    return JobCrewService.remove(...args)
  }

  static async updateCrew(...args: Parameters<typeof import('./job-crew-service').JobCrewService.update>) {
    const { JobCrewService } = await import('./job-crew-service')
    return JobCrewService.update(...args)
  }

  static async clockInOut(...args: Parameters<typeof import('./job-crew-service').JobCrewService.clockInOut>) {
    const { JobCrewService } = await import('./job-crew-service')
    return JobCrewService.clockInOut(...args)
  }

  static async getAvailableCrew(...args: Parameters<typeof import('./job-crew-service').JobCrewService.getAvailable>) {
    const { JobCrewService } = await import('./job-crew-service')
    return JobCrewService.getAvailable(...args)
  }

  static async addChangeOrder(...args: Parameters<typeof import('./job-change-orders-service').JobChangeOrdersService.add>) {
    const { JobChangeOrdersService } = await import('./job-change-orders-service')
    return JobChangeOrdersService.add(...args)
  }

  static async approveChangeOrder(...args: Parameters<typeof import('./job-change-orders-service').JobChangeOrdersService.approve>) {
    const { JobChangeOrdersService } = await import('./job-change-orders-service')
    return JobChangeOrdersService.approve(...args)
  }

  static async rejectChangeOrder(...args: Parameters<typeof import('./job-change-orders-service').JobChangeOrdersService.reject>) {
    const { JobChangeOrdersService } = await import('./job-change-orders-service')
    return JobChangeOrdersService.reject(...args)
  }

  static async addNote(...args: Parameters<typeof import('./job-notes-service').JobNotesService.add>) {
    const { JobNotesService } = await import('./job-notes-service')
    return JobNotesService.add(...args)
  }

  static async deleteNote(...args: Parameters<typeof import('./job-notes-service').JobNotesService.remove>) {
    const { JobNotesService } = await import('./job-notes-service')
    return JobNotesService.remove(...args)
  }

  static async addEquipment(...args: Parameters<typeof import('./job-resources-service').JobResourcesService.addEquipment>) {
    const { JobResourcesService } = await import('./job-resources-service')
    return JobResourcesService.addEquipment(...args)
  }

  static async updateEquipmentStatus(...args: Parameters<typeof import('./job-resources-service').JobResourcesService.updateEquipmentStatus>) {
    const { JobResourcesService } = await import('./job-resources-service')
    return JobResourcesService.updateEquipmentStatus(...args)
  }

  static async deleteEquipment(...args: Parameters<typeof import('./job-resources-service').JobResourcesService.deleteEquipment>) {
    const { JobResourcesService } = await import('./job-resources-service')
    return JobResourcesService.deleteEquipment(...args)
  }

  static async addMaterial(...args: Parameters<typeof import('./job-resources-service').JobResourcesService.addMaterial>) {
    const { JobResourcesService } = await import('./job-resources-service')
    return JobResourcesService.addMaterial(...args)
  }

  static async updateMaterialUsage(...args: Parameters<typeof import('./job-resources-service').JobResourcesService.updateMaterialUsage>) {
    const { JobResourcesService } = await import('./job-resources-service')
    return JobResourcesService.updateMaterialUsage(...args)
  }

  static async deleteMaterial(...args: Parameters<typeof import('./job-resources-service').JobResourcesService.deleteMaterial>) {
    const { JobResourcesService } = await import('./job-resources-service')
    return JobResourcesService.deleteMaterial(...args)
  }

  static async addDisposal(...args: Parameters<typeof import('./job-resources-service').JobResourcesService.addDisposal>) {
    const { JobResourcesService } = await import('./job-resources-service')
    return JobResourcesService.addDisposal(...args)
  }

  static async updateDisposal(...args: Parameters<typeof import('./job-resources-service').JobResourcesService.updateDisposal>) {
    const { JobResourcesService } = await import('./job-resources-service')
    return JobResourcesService.updateDisposal(...args)
  }

  static async deleteDisposal(...args: Parameters<typeof import('./job-resources-service').JobResourcesService.deleteDisposal>) {
    const { JobResourcesService } = await import('./job-resources-service')
    return JobResourcesService.deleteDisposal(...args)
  }
}
