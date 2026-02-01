import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import type {
  JobTimeEntry,
  JobMaterialUsage,
  JobCompletionPhoto,
  JobCompletionChecklist,
  JobCompletion,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  CreateMaterialUsageInput,
  UpdateMaterialUsageInput,
  CreateCompletionPhotoInput,
  UpdateCompletionPhotoInput,
  UpdateChecklistItemInput,
  CreateCompletionInput,
  UpdateCompletionInput,
  SubmitCompletionInput,
  ApproveCompletionInput,
  RejectCompletionInput,
  VarianceAnalysis,
  VarianceFilters,
  VarianceSummary,
  GroupedChecklists,
  ChecklistCategory,
} from '@/types/job-completion'

export class JobCompletionService {
  // ========== TIME ENTRIES ==========

  static async getTimeEntries(jobId: string): Promise<JobTimeEntry[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_time_entries')
      .select(`
        *,
        profile:profiles!job_time_entries_profile_id_fkey(id, full_name, email, avatar_url),
        creator:profiles!job_time_entries_created_by_fkey(id, full_name)
      `)
      .eq('job_id', jobId)
      .order('work_date', { ascending: false })

    if (error) throw error

    return (data || []).map(entry => ({
      ...entry,
      profile: Array.isArray(entry.profile) ? entry.profile[0] : entry.profile,
      creator: Array.isArray(entry.creator) ? entry.creator[0] : entry.creator,
    }))
  }

  static async createTimeEntry(input: CreateTimeEntryInput): Promise<JobTimeEntry> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

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

    if (error) throw error

    // Update completion variance if exists
    await JobCompletionService.updateCompletionVariance(input.job_id)

    await Activity.created('time_entry', data.id, `${input.hours} hours`)

    return data
  }

  static async updateTimeEntry(id: string, input: UpdateTimeEntryInput): Promise<JobTimeEntry> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_time_entries')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Update completion variance
    await JobCompletionService.updateCompletionVariance(data.job_id)

    await Activity.updated('time_entry', data.id)

    return data
  }

  static async deleteTimeEntry(id: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Get job_id before deleting
    const { data: entry } = await supabase
      .from('job_time_entries')
      .select('job_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('job_time_entries')
      .delete()
      .eq('id', id)

    if (error) throw error

    if (entry) {
      await JobCompletionService.updateCompletionVariance(entry.job_id)
    }

    await Activity.deleted('time_entry', id)
  }

  // ========== MATERIAL USAGE ==========

  static async getMaterialUsage(jobId: string): Promise<JobMaterialUsage[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_material_usage')
      .select(`
        *,
        creator:profiles!job_material_usage_created_by_fkey(id, full_name)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(usage => ({
      ...usage,
      creator: Array.isArray(usage.creator) ? usage.creator[0] : usage.creator,
    }))
  }

  static async createMaterialUsage(input: CreateMaterialUsageInput): Promise<JobMaterialUsage> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_material_usage')
      .insert({
        job_id: input.job_id,
        job_material_id: input.job_material_id,
        material_name: input.material_name,
        material_type: input.material_type,
        quantity_estimated: input.quantity_estimated,
        quantity_used: input.quantity_used,
        unit: input.unit,
        unit_cost: input.unit_cost,
        notes: input.notes,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Update completion variance
    await JobCompletionService.updateCompletionVariance(input.job_id)

    await Activity.created('material_usage', data.id, input.material_name)

    return data
  }

  static async updateMaterialUsage(id: string, input: UpdateMaterialUsageInput): Promise<JobMaterialUsage> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_material_usage')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Update completion variance
    await JobCompletionService.updateCompletionVariance(data.job_id)

    await Activity.updated('material_usage', data.id, data.material_name)

    return data
  }

  static async deleteMaterialUsage(id: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Get job_id before deleting
    const { data: usage } = await supabase
      .from('job_material_usage')
      .select('job_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('job_material_usage')
      .delete()
      .eq('id', id)

    if (error) throw error

    if (usage) {
      await JobCompletionService.updateCompletionVariance(usage.job_id)
    }

    await Activity.deleted('material_usage', id)
  }

  // ========== COMPLETION PHOTOS ==========

  static async getPhotos(jobId: string): Promise<JobCompletionPhoto[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_completion_photos')
      .select(`
        *,
        uploader:profiles!job_completion_photos_uploaded_by_fkey(id, full_name, avatar_url)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(photo => ({
      ...photo,
      uploader: Array.isArray(photo.uploader) ? photo.uploader[0] : photo.uploader,
    }))
  }

  static async createPhoto(input: CreateCompletionPhotoInput): Promise<JobCompletionPhoto> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_completion_photos')
      .insert({
        job_id: input.job_id,
        photo_url: input.photo_url,
        thumbnail_url: input.thumbnail_url,
        storage_path: input.storage_path,
        photo_type: input.photo_type || 'during',
        caption: input.caption,
        taken_at: input.taken_at,
        location_lat: input.location_lat,
        location_lng: input.location_lng,
        camera_make: input.camera_make,
        camera_model: input.camera_model,
        image_width: input.image_width,
        image_height: input.image_height,
        file_name: input.file_name,
        file_size: input.file_size,
        mime_type: input.mime_type,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    await Activity.created('completion_photo', data.id, input.photo_type || 'during')

    return data
  }

  static async updatePhoto(id: string, input: UpdateCompletionPhotoInput): Promise<JobCompletionPhoto> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_completion_photos')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await Activity.updated('completion_photo', data.id)

    return data
  }

  static async deletePhoto(id: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Get storage path before deleting from DB
    const { data: photo } = await supabase
      .from('job_completion_photos')
      .select('storage_path')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('job_completion_photos')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Delete from storage
    if (photo?.storage_path) {
      await supabase.storage
        .from('job-completion-photos')
        .remove([photo.storage_path])
    }

    await Activity.deleted('completion_photo', id)
  }

  // ========== CHECKLISTS ==========

  static async getChecklist(jobId: string): Promise<JobCompletionChecklist[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_completion_checklists')
      .select(`
        *,
        completer:profiles!job_completion_checklists_completed_by_fkey(id, full_name)
      `)
      .eq('job_id', jobId)
      .order('category')
      .order('sort_order')

    if (error) throw error

    return (data || []).map(item => ({
      ...item,
      completer: Array.isArray(item.completer) ? item.completer[0] : item.completer,
    }))
  }

  static async getChecklistGrouped(jobId: string): Promise<GroupedChecklists> {
    const items = await JobCompletionService.getChecklist(jobId)

    const grouped: GroupedChecklists = {
      safety: [],
      quality: [],
      cleanup: [],
      documentation: [],
      custom: [],
    }

    items.forEach(item => {
      const category = item.category as ChecklistCategory
      if (grouped[category]) {
        grouped[category].push(item)
      }
    })

    return grouped
  }

  static async initializeChecklist(jobId: string): Promise<JobCompletionChecklist[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Check if checklist already exists
    const { count } = await supabase
      .from('job_completion_checklists')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)

    if (count && count > 0) {
      // Return existing checklist
      return JobCompletionService.getChecklist(jobId)
    }

    // Initialize default checklist using RPC
    const { error } = await supabase.rpc('initialize_job_checklist', {
      p_job_id: jobId,
    })

    if (error) throw error

    await Activity.created('checklist', jobId, 'Job checklist initialized')

    return JobCompletionService.getChecklist(jobId)
  }

  static async toggleChecklistItem(
    id: string,
    completed: boolean,
    notes?: string
  ): Promise<JobCompletionChecklist> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_completion_checklists')
      .update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? user.id : null,
        completion_notes: notes,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return data
  }

  static async updateChecklistItem(
    id: string,
    input: UpdateChecklistItemInput
  ): Promise<JobCompletionChecklist> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const updateData: Record<string, unknown> = {}

    if (input.is_completed !== undefined) {
      updateData.is_completed = input.is_completed
      updateData.completed_at = input.is_completed ? new Date().toISOString() : null
      updateData.completed_by = input.is_completed ? user.id : null
    }

    if (input.completion_notes !== undefined) {
      updateData.completion_notes = input.completion_notes
    }

    if (input.evidence_photo_ids !== undefined) {
      updateData.evidence_photo_ids = input.evidence_photo_ids
    }

    const { data, error } = await supabase
      .from('job_completion_checklists')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return data
  }

  // ========== JOB COMPLETIONS ==========

  static async getCompletion(jobId: string): Promise<JobCompletion | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_completions')
      .select(`
        *,
        submitter:profiles!job_completions_submitted_by_fkey(id, full_name, avatar_url),
        reviewer:profiles!job_completions_reviewed_by_fkey(id, full_name, avatar_url)
      `)
      .eq('job_id', jobId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    if (!data) return null

    return {
      ...data,
      submitter: Array.isArray(data.submitter) ? data.submitter[0] : data.submitter,
      reviewer: Array.isArray(data.reviewer) ? data.reviewer[0] : data.reviewer,
    }
  }

  static async createCompletion(input: CreateCompletionInput): Promise<JobCompletion> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Check if completion already exists
    const existing = await JobCompletionService.getCompletion(input.job_id)
    if (existing) {
      return existing
    }

    // Get job data for estimated values
    const { data: job } = await supabase
      .from('jobs')
      .select('estimated_duration_hours, contract_amount, job_number')
      .eq('id', input.job_id)
      .single()

    const { data, error } = await supabase
      .from('job_completions')
      .insert({
        job_id: input.job_id,
        status: 'draft',
        estimated_hours: input.estimated_hours || job?.estimated_duration_hours,
        estimated_material_cost: input.estimated_material_cost,
        estimated_total: input.estimated_total || job?.contract_amount,
        field_notes: input.field_notes,
        issues_encountered: input.issues_encountered,
        recommendations: input.recommendations,
      })
      .select()
      .single()

    if (error) throw error

    // Link completion to job
    await supabase
      .from('jobs')
      .update({ completion_id: data.id })
      .eq('id', input.job_id)

    // Calculate initial variance
    await JobCompletionService.updateCompletionVariance(input.job_id)

    await Activity.created('job_completion', data.id, job?.job_number)

    return data
  }

  static async updateCompletion(
    jobId: string,
    input: UpdateCompletionInput
  ): Promise<JobCompletion> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const updateData: Record<string, unknown> = { ...input }

    if (input.customer_signed) {
      updateData.customer_signed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('job_completions')
      .update(updateData)
      .eq('job_id', jobId)
      .select()
      .single()

    if (error) throw error

    await Activity.updated('job_completion', data.id)

    return data
  }

  static async submitCompletion(
    jobId: string,
    input?: SubmitCompletionInput
  ): Promise<JobCompletion> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Update variance before submission
    await JobCompletionService.updateCompletionVariance(jobId)

    const updateData: Record<string, unknown> = {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: user.id,
    }

    if (input?.field_notes) updateData.field_notes = input.field_notes
    if (input?.issues_encountered) updateData.issues_encountered = input.issues_encountered
    if (input?.recommendations) updateData.recommendations = input.recommendations

    const { data, error } = await supabase
      .from('job_completions')
      .update(updateData)
      .eq('job_id', jobId)
      .select()
      .single()

    if (error) throw error

    await Activity.statusChanged('job_completion', data.id, undefined, 'draft', 'submitted')

    return data
  }

  static async approveCompletion(
    jobId: string,
    input?: ApproveCompletionInput
  ): Promise<JobCompletion> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_completions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        review_notes: input?.review_notes,
      })
      .eq('job_id', jobId)
      .select()
      .single()

    if (error) throw error

    // Update job status to completed
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        actual_end_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', jobId)

    await Activity.statusChanged('job_completion', data.id, undefined, 'submitted', 'approved')

    return data
  }

  static async rejectCompletion(
    jobId: string,
    input: RejectCompletionInput
  ): Promise<JobCompletion> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('job_completions')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        review_notes: input.review_notes,
        rejection_reason: input.rejection_reason,
      })
      .eq('job_id', jobId)
      .select()
      .single()

    if (error) throw error

    await Activity.statusChanged('job_completion', data.id, undefined, 'submitted', 'rejected')

    return data
  }

  // ========== VARIANCE ANALYSIS ==========

  static async updateCompletionVariance(jobId: string): Promise<void> {
    const supabase = await createClient()

    // Get completion id
    const { data: completion } = await supabase
      .from('job_completions')
      .select('id')
      .eq('job_id', jobId)
      .single()

    if (!completion) return

    // Call the variance calculation function
    await supabase.rpc('calculate_completion_variance', {
      p_completion_id: completion.id,
    })
  }

  static async getVarianceAnalysis(filters?: VarianceFilters): Promise<VarianceAnalysis[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    let query = supabase
      .from('job_completions')
      .select(`
        *,
        job:jobs!inner(
          id,
          job_number,
          name,
          customer:customers(name, company_name),
          hazard_types,
          contract_amount,
          estimated_duration_hours
        )
      `)
      .eq('status', 'approved')

    if (filters?.start_date) {
      query = query.gte('reviewed_at', filters.start_date)
    }

    if (filters?.end_date) {
      query = query.lte('reviewed_at', filters.end_date)
    }

    const { data, error } = await query.order('reviewed_at', { ascending: false })

    if (error) throw error

    // Transform data
    const analyses: VarianceAnalysis[] = []

    for (const completion of data || []) {
      const job = Array.isArray(completion.job) ? completion.job[0] : completion.job
      const customer = job?.customer
        ? (Array.isArray(job.customer) ? job.customer[0] : job.customer)
        : null

      if (filters?.customer_id && job?.id !== filters.customer_id) continue

      if (filters?.hazard_types?.length) {
        const jobHazards = job?.hazard_types || []
        const hasMatch = filters.hazard_types.some(h => jobHazards.includes(h))
        if (!hasMatch) continue
      }

      if (filters?.variance_threshold !== undefined) {
        const variance = Math.abs(completion.cost_variance_percent || 0)
        if (variance < filters.variance_threshold) continue
      }

      // Get material usage for breakdown
      const { data: materials } = await supabase
        .from('job_material_usage')
        .select('material_name, quantity_estimated, quantity_used, variance_quantity, variance_percent, unit')
        .eq('job_id', job?.id)

      analyses.push({
        job_id: job?.id,
        job_number: job?.job_number,
        job_name: job?.name,
        customer_name: customer?.company_name || customer?.name || 'Unknown',
        completion_date: completion.reviewed_at,
        estimated_hours: completion.estimated_hours,
        actual_hours: completion.actual_hours,
        hours_variance: completion.hours_variance,
        hours_variance_percent: completion.hours_variance_percent,
        estimated_cost: completion.estimated_total,
        actual_cost: completion.actual_total,
        cost_variance: completion.cost_variance,
        cost_variance_percent: completion.cost_variance_percent,
        materials_summary: (materials || []).map(m => ({
          material_name: m.material_name,
          estimated_qty: m.quantity_estimated,
          actual_qty: m.quantity_used,
          variance_qty: m.variance_quantity,
          variance_percent: m.variance_percent,
          unit: m.unit,
        })),
      })
    }

    return analyses
  }

  static async getVarianceSummary(filters?: VarianceFilters): Promise<VarianceSummary> {
    const analyses = await JobCompletionService.getVarianceAnalysis(filters)

    const summary: VarianceSummary = {
      total_jobs: analyses.length,
      over_budget_count: 0,
      under_budget_count: 0,
      on_target_count: 0,
      avg_hours_variance: 0,
      avg_cost_variance: 0,
      total_hours_variance: 0,
      total_cost_variance: 0,
    }

    if (analyses.length === 0) return summary

    let hoursVarianceSum = 0
    let costVarianceSum = 0

    analyses.forEach(a => {
      const costVariance = a.cost_variance_percent || 0

      if (costVariance > 5) {
        summary.over_budget_count++
      } else if (costVariance < -5) {
        summary.under_budget_count++
      } else {
        summary.on_target_count++
      }

      hoursVarianceSum += a.hours_variance || 0
      costVarianceSum += a.cost_variance || 0
      summary.total_hours_variance += a.hours_variance || 0
      summary.total_cost_variance += a.cost_variance || 0
    })

    summary.avg_hours_variance = hoursVarianceSum / analyses.length
    summary.avg_cost_variance = costVarianceSum / analyses.length

    return summary
  }

  // ========== STORAGE HELPERS ==========

  static async uploadPhoto(
    jobId: string,
    organizationId: string,
    file: File
  ): Promise<{ url: string; path: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `${organizationId}/${jobId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('job-completion-photos')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('job-completion-photos')
      .getPublicUrl(storagePath)

    return { url: publicUrl, path: storagePath }
  }

  // ========== COMPLETION SUMMARY ==========

  static async getCompletionSummary(jobId: string): Promise<{
    timeEntries: JobTimeEntry[]
    materialUsage: JobMaterialUsage[]
    photos: JobCompletionPhoto[]
    checklist: GroupedChecklists
    completion: JobCompletion | null
    checklistProgress: { completed: number; required: number; total: number }
  }> {
    const [timeEntries, materialUsage, photos, checklist, completion] = await Promise.all([
      JobCompletionService.getTimeEntries(jobId),
      JobCompletionService.getMaterialUsage(jobId),
      JobCompletionService.getPhotos(jobId),
      JobCompletionService.getChecklistGrouped(jobId),
      JobCompletionService.getCompletion(jobId),
    ])

    // Calculate checklist progress
    const allItems = Object.values(checklist).flat()
    const requiredItems = allItems.filter(i => i.is_required)
    const completedItems = allItems.filter(i => i.is_completed)

    return {
      timeEntries,
      materialUsage,
      photos,
      checklist,
      completion,
      checklistProgress: {
        completed: completedItems.length,
        required: requiredItems.filter(i => i.is_completed).length,
        total: allItems.length,
      },
    }
  }
}
