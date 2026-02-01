import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import type {
  Job,
  JobCrew,
  JobChangeOrder,
  JobNote,
  JobEquipment,
  JobMaterial,
  JobDisposal,
  CreateJobInput,
  CreateJobFromProposalInput,
  UpdateJobInput,
  AssignCrewInput,
  ClockInOutInput,
  AddChangeOrderInput,
  AddJobNoteInput,
  AddJobEquipmentInput,
  AddJobMaterialInput,
  AddJobDisposalInput,
  JobStatus,
} from '@/types/jobs'

export class JobsService {
  // ========== JOBS ==========

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
  }): Promise<Job[]> {
    const supabase = await createClient()

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
      `)
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

    const { data, error } = await query
    if (error) throw error

    // Transform and filter
    let jobs = (data || []).map(job => ({
      ...job,
      customer: Array.isArray(job.customer) ? job.customer[0] : job.customer,
    }))

    // Filter by crew member if needed (post-query since it's a nested filter)
    if (filters?.crew_member_id && jobs) {
      jobs = jobs.filter(job =>
        job.crew?.some((c: JobCrew) => c.profile_id === filters.crew_member_id)
      )
    }

    return jobs
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

  // ========== CREW ==========

  static async assignCrew(input: AssignCrewInput): Promise<JobCrew> {
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

  static async removeCrew(jobId: string, profileId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('job_crew')
      .delete()
      .eq('job_id', jobId)
      .eq('profile_id', profileId)

    if (error) throw error
  }

  static async updateCrew(crewId: string, updates: Partial<JobCrew>): Promise<JobCrew> {
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

  static async getAvailableCrew(date: string): Promise<Array<{ id: string; full_name: string; email: string; role: string; is_available: boolean }>> {
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

  // ========== CHANGE ORDERS ==========

  static async addChangeOrder(jobId: string, input: AddChangeOrderInput): Promise<JobChangeOrder> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Generate change order number
    const { data: existing } = await supabase
      .from('job_change_orders')
      .select('change_order_number')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)

    const nextNum = existing?.length
      ? parseInt(existing[0].change_order_number.split('-').pop() || '0') + 1
      : 1

    const { data: job } = await supabase
      .from('jobs')
      .select('job_number')
      .eq('id', jobId)
      .single()

    const coNumber = `${job?.job_number}-CO${nextNum.toString().padStart(2, '0')}`

    const { data, error } = await supabase
      .from('job_change_orders')
      .insert({
        job_id: jobId,
        change_order_number: coNumber,
        description: input.description,
        reason: input.reason,
        amount: input.amount,
        status: 'pending',
        created_by: user?.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async approveChangeOrder(id: string): Promise<JobChangeOrder> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('job_change_orders')
      .update({
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async rejectChangeOrder(id: string): Promise<JobChangeOrder> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('job_change_orders')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== NOTES ==========

  static async addNote(jobId: string, input: AddJobNoteInput): Promise<JobNote> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('job_notes')
      .insert({
        job_id: jobId,
        note_type: input.note_type,
        content: input.content,
        attachments: input.attachments || [],
        is_internal: input.is_internal ?? true,
        created_by: user?.id,
      })
      .select(`
        *,
        author:profiles(id, full_name)
      `)
      .single()

    if (error) throw error
    return {
      ...data,
      author: Array.isArray(data.author) ? data.author[0] : data.author,
    }
  }

  static async deleteNote(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('job_notes')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== EQUIPMENT ==========

  static async addEquipment(jobId: string, input: AddJobEquipmentInput): Promise<JobEquipment> {
    const supabase = await createClient()

    // Calculate rental days and total if rental
    let rental_days: number | undefined
    let rental_total: number | undefined

    if (input.is_rental && input.rental_start_date && input.rental_end_date && input.rental_rate_daily) {
      const start = new Date(input.rental_start_date)
      const end = new Date(input.rental_end_date)
      rental_days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      rental_total = rental_days * input.rental_rate_daily * (input.quantity || 1)
    }

    const { data, error } = await supabase
      .from('job_equipment')
      .insert({
        job_id: jobId,
        equipment_name: input.equipment_name,
        equipment_type: input.equipment_type,
        quantity: input.quantity || 1,
        is_rental: input.is_rental || false,
        rental_rate_daily: input.rental_rate_daily,
        rental_start_date: input.rental_start_date,
        rental_end_date: input.rental_end_date,
        rental_days,
        rental_total,
        notes: input.notes,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateEquipmentStatus(id: string, status: string): Promise<JobEquipment> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('job_equipment')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteEquipment(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('job_equipment')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== MATERIALS ==========

  static async addMaterial(jobId: string, input: AddJobMaterialInput): Promise<JobMaterial> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('job_materials')
      .insert({
        job_id: jobId,
        material_name: input.material_name,
        material_type: input.material_type,
        quantity_estimated: input.quantity_estimated,
        unit: input.unit,
        unit_cost: input.unit_cost,
        total_cost: input.quantity_estimated && input.unit_cost
          ? input.quantity_estimated * input.unit_cost
          : undefined,
        notes: input.notes,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateMaterialUsage(id: string, quantity_used: number): Promise<JobMaterial> {
    const supabase = await createClient()

    // Get the material to calculate total cost
    const { data: material } = await supabase
      .from('job_materials')
      .select('unit_cost')
      .eq('id', id)
      .single()

    const total_cost = material?.unit_cost ? quantity_used * material.unit_cost : undefined

    const { data, error } = await supabase
      .from('job_materials')
      .update({ quantity_used, total_cost })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteMaterial(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('job_materials')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== DISPOSAL ==========

  static async addDisposal(jobId: string, input: AddJobDisposalInput): Promise<JobDisposal> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('job_disposal')
      .insert({
        job_id: jobId,
        hazard_type: input.hazard_type,
        disposal_type: input.disposal_type,
        quantity: input.quantity,
        unit: input.unit,
        manifest_number: input.manifest_number,
        manifest_date: input.manifest_date,
        disposal_facility_name: input.disposal_facility_name,
        disposal_facility_address: input.disposal_facility_address,
        disposal_cost: input.disposal_cost,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateDisposal(id: string, updates: Partial<AddJobDisposalInput>): Promise<JobDisposal> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('job_disposal')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteDisposal(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('job_disposal')
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
}
