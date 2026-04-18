import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { createServiceLogger, formatError } from '@/lib/utils/logger'
import type {
  Job,
  JobCrew,
  CreateJobInput,
  CreateJobFromProposalInput,
  UpdateJobInput,
  JobStatus,
} from '@/types/jobs'

const log = createServiceLogger('JobsService')

// Job number convention JOB-<street>-<mmddyyyy> — shared helper in
// lib/utils/entity-number keeps this identical to the estimate convention.
async function generateJobNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  jobAddress: string | null | undefined,
  scheduledStartDate: string | null | undefined,
): Promise<string> {
  const { buildEntityNumberBase, withUniqueSuffix } = await import('@/lib/utils/entity-number')
  const base = buildEntityNumberBase('JOB', jobAddress, scheduledStartDate)

  const { data: existing } = await supabase
    .from('jobs')
    .select('job_number')
    .eq('organization_id', organizationId)
    .like('job_number', `${base}%`)

  const taken = new Set((existing || []).map((r) => r.job_number as string))
  return withUniqueSuffix(base, taken)
}

// Fires the external calendar sync(s) the org has active. Failures never
// block the user's job save — they're logged and surfaced through the
// calendar_sync_events table's sync_error column instead.
async function syncJobToExternalCalendars(jobId: string, organizationId: string): Promise<void> {
  const supabase = await createClient()
  const { data: integrations } = await supabase
    .from('organization_integrations')
    .select('integration_type, settings')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .in('integration_type', ['google_calendar', 'outlook_calendar'])

  if (!integrations || integrations.length === 0) return

  for (const integration of integrations) {
    const settings = (integration.settings as Record<string, unknown> | null) || {}
    // Respect per-integration opt-out. Default true so connecting a calendar
    // just works without digging into settings.
    if (settings.auto_sync_jobs === false) continue

    try {
      if (integration.integration_type === 'google_calendar') {
        const { GoogleCalendarService } = await import('@/lib/services/google-calendar-service')
        await GoogleCalendarService.syncJobToCalendar(organizationId, jobId)
      } else if (integration.integration_type === 'outlook_calendar') {
        const { OutlookCalendarService } = await import('@/lib/services/outlook-calendar-service')
        await OutlookCalendarService.syncJobToCalendar(organizationId, jobId)
      }
    } catch (e) {
      log.error(
        { jobId, integration: integration.integration_type, err: formatError(e) },
        'external calendar sync failed',
      )
      await supabase
        .from('calendar_sync_events')
        .upsert({
          organization_id: organizationId,
          job_id: jobId,
          event_type: 'job',
          calendar_type: integration.integration_type === 'google_calendar' ? 'google' : 'outlook',
          sync_error: e instanceof Error ? e.message : String(e),
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'job_id,calendar_type' })
    }
  }
}

async function deleteJobFromExternalCalendars(jobId: string, organizationId: string): Promise<void> {
  const supabase = await createClient()
  const { data: syncRows } = await supabase
    .from('calendar_sync_events')
    .select('calendar_type, google_event_id, outlook_event_id')
    .eq('job_id', jobId)

  if (!syncRows || syncRows.length === 0) return

  for (const row of syncRows) {
    try {
      if (row.calendar_type === 'google' && row.google_event_id) {
        const { GoogleCalendarService } = await import('@/lib/services/google-calendar-service')
        await GoogleCalendarService.deleteCalendarEvent(organizationId, row.google_event_id)
      } else if (row.calendar_type === 'outlook' && row.outlook_event_id) {
        const { OutlookCalendarService } = await import('@/lib/services/outlook-calendar-service')
        await OutlookCalendarService.deleteCalendarEvent(organizationId, row.outlook_event_id)
      }
    } catch (e) {
      log.error(
        { jobId, calendar: row.calendar_type, err: formatError(e) },
        'external calendar delete failed',
      )
    }
  }

  await supabase.from('calendar_sync_events').delete().eq('job_id', jobId)
}

export class JobsService {
  static async create(input: CreateJobInput): Promise<Job> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new SecureError('UNAUTHORIZED')

    const organizationId = profile.organization_id

    const jobNumber = await generateJobNumber(
      supabase,
      organizationId,
      input.job_address,
      input.scheduled_start_date,
    )

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

    if (error) throwDbError(error, 'create job')

    // Schedule customer reminders
    await JobsService.scheduleReminders(data.id)

    // The 'created' activity_log entry is emitted by the trg_activity_jobs
    // DB trigger; no need to log from here.

    // Push to any connected external calendars (Google / Outlook). Failures
    // are logged but don't block job creation.
    await syncJobToExternalCalendars(data.id, organizationId)

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
      throw new SecureError('NOT_FOUND', 'Proposal not found')
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

    if (updateError) throwDbError(updateError, 'update job')

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
    if (error) throwDbError(error, 'fetch jobs')

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

    // A job overlaps [start, end] when it starts on or before `end` AND ends
    // on or after `start`. Jobs without a scheduled_end_date are treated as
    // single-day events (end = start).
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
      .lte('scheduled_start_date', end)
      .or(`scheduled_end_date.gte.${start},and(scheduled_end_date.is.null,scheduled_start_date.gte.${start})`)
      .neq('status', 'cancelled')
      .order('scheduled_start_date', { ascending: true })

    if (error) throwDbError(error, 'fetch jobs')

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

    if (error) throwDbError(error, 'update job')

    // Cancelled jobs shouldn't occupy anyone's calendar and shouldn't keep
    // pending reminders queued up. For any other status change (or non-status
    // update), re-sync the external calendar and re-schedule reminders — the
    // calendar services update their event in place; scheduleReminders is
    // idempotent.
    if (data.organization_id) {
      if (data.status === 'cancelled') {
        await deleteJobFromExternalCalendars(data.id, data.organization_id)
        await JobsService.cancelReminders(data.id)
      } else {
        await syncJobToExternalCalendars(data.id, data.organization_id)
        // Only re-schedule if the timing actually changed — avoids churn on
        // updates that don't move the job (e.g. changing crew).
        const timingChanged =
          (updates as Record<string, unknown>).scheduled_start_date !== undefined
          || (updates as Record<string, unknown>).scheduled_start_time !== undefined
          || (updates as Record<string, unknown>).scheduled_end_date !== undefined
        if (timingChanged) {
          await JobsService.scheduleReminders(data.id)
        }
      }
    }

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

    // Auto-notify the customer on meaningful transitions. The SMS service
    // itself handles all the "can we actually send" gates (org toggle,
    // sms_enabled, customer opt-in, phone on file), so we just fire the
    // appropriate variant and ignore the nullable return.
    if (oldStatus && oldStatus !== status) {
      try {
        const { SmsService } = await import('@/lib/services/sms-service')
        if (status === 'in_progress') {
          await SmsService.sendJobStatusUpdate(id, 'arrived')
        } else if (status === 'completed') {
          await SmsService.sendJobStatusUpdate(id, 'completed')
        }
      } catch (e) {
        log.warn(
          { jobId: id, status, err: formatError(e) },
          'job status SMS notification failed',
        )
      }
    }

    return updatedJob
  }

  static async delete(id: string): Promise<void> {
    const supabase = await createClient()

    // Look up org_id before deletion so we can remove the associated external
    // calendar events afterwards.
    const { data: job } = await supabase
      .from('jobs')
      .select('organization_id')
      .eq('id', id)
      .single()

    // Cancel reminders first
    await JobsService.cancelReminders(id)

    if (job?.organization_id) {
      await deleteJobFromExternalCalendars(id, job.organization_id)
    }

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)

    if (error) throwDbError(error, 'delete job')
  }

  // ========== REMINDERS ==========

  // Customer-facing cadence:
  //   1. Email on confirmation (immediate)
  //   2. SMS one week before the job
  //   3. SMS on the morning of the job
  //
  // Template variables are deliberately a small, safe set — customer name,
  // date/time, address, job number. No internal notes, access codes, or
  // other staff-facing fields ever enter this payload, so the processor
  // can render without worrying about leakage.
  //
  // Idempotent: cancels any pending rows for this job first so calling it
  // after a reschedule doesn't produce duplicates.
  static async scheduleReminders(jobId: string): Promise<void> {
    const supabase = await createClient()

    const job = await JobsService.getById(jobId)
    if (!job || !job.customer) return
    if (!job.scheduled_start_date) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', job.created_by)
      .single()

    if (!profile) return

    // Clear any previously pending reminders for this job so we don't end up
    // with stale rows after a reschedule.
    await supabase
      .from('scheduled_reminders')
      .update({ status: 'cancelled' })
      .eq('related_type', 'job')
      .eq('related_id', jobId)
      .eq('status', 'pending')

    const customer = job.customer
    const scheduledDate = new Date(job.scheduled_start_date)
    const now = new Date()

    const commonVars = {
      customer_name: customer.name || customer.company_name,
      scheduled_date: job.scheduled_start_date,
      scheduled_time: job.scheduled_start_time,
      property_address: job.job_address,
      job_number: job.job_number,
    }

    const rows: Array<Record<string, unknown>> = []

    // 1. Confirmation email — goes out on the next cron tick.
    if (customer.email) {
      rows.push({
        organization_id: profile.organization_id,
        related_type: 'job',
        related_id: jobId,
        reminder_type: 'job_confirmation',
        recipient_type: 'customer',
        recipient_email: customer.email,
        recipient_phone: customer.phone,
        channel: 'email',
        scheduled_for: now.toISOString(),
        template_slug: 'job_confirmation',
        template_variables: commonVars,
      })
    }

    // 2. Week-before SMS at 9am local-ish (server time).
    const weekBefore = new Date(scheduledDate)
    weekBefore.setDate(weekBefore.getDate() - 7)
    weekBefore.setHours(9, 0, 0, 0)
    if (weekBefore > now && customer.phone) {
      rows.push({
        organization_id: profile.organization_id,
        related_type: 'job',
        related_id: jobId,
        reminder_type: 'job_reminder_week',
        recipient_type: 'customer',
        recipient_email: customer.email,
        recipient_phone: customer.phone,
        channel: 'sms',
        scheduled_for: weekBefore.toISOString(),
        template_slug: 'job_reminder_week',
        template_variables: commonVars,
      })
    }

    // 3. Day-of SMS at 7am so the customer sees it before the crew arrives.
    const dayOf = new Date(scheduledDate)
    dayOf.setHours(7, 0, 0, 0)
    if (dayOf > now && customer.phone) {
      rows.push({
        organization_id: profile.organization_id,
        related_type: 'job',
        related_id: jobId,
        reminder_type: 'job_reminder_day',
        recipient_type: 'customer',
        recipient_email: customer.email,
        recipient_phone: customer.phone,
        channel: 'sms',
        scheduled_for: dayOf.toISOString(),
        template_slug: 'job_reminder_day',
        template_variables: commonVars,
      })
    }

    if (rows.length === 0) return

    const { data: inserted } = await supabase
      .from('scheduled_reminders')
      .insert(rows)
      .select('id, template_slug')

    // Fire the confirmation email synchronously so the customer gets it
    // now, not on the next hourly cron tick. Any failure is captured on
    // the row itself and will be picked up by the processor next tick.
    const confirmation = inserted?.find((r) => r.template_slug === 'job_confirmation')
    if (confirmation) {
      try {
        const { sendReminderRow } = await import('@/lib/services/reminder-sender')
        await sendReminderRow(confirmation.id)
      } catch (e) {
        log.warn(
          { jobId, rowId: confirmation.id, err: formatError(e) },
          'immediate confirmation send failed; cron will retry',
        )
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
