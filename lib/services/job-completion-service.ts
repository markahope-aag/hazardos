import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { JobTimeEntriesService } from '@/lib/services/job-time-entries-service'
import { JobMaterialsService } from '@/lib/services/job-materials-service'
import { JobCompletionPhotosService } from '@/lib/services/job-completion-photos-service'
import { JobChecklistService } from '@/lib/services/job-checklist-service'
import { JobVarianceService } from '@/lib/services/job-variance-service'
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
} from '@/types/job-completion'

/**
 * Facade that preserves the original static API while delegating to focused services.
 *
 * Extracted services:
 *  - JobTimeEntriesService      (job-time-entries-service.ts)
 *  - JobMaterialsService        (job-materials-service.ts)
 *  - JobCompletionPhotosService (job-completion-photos-service.ts)
 *  - JobChecklistService        (job-checklist-service.ts)
 *  - JobVarianceService         (job-variance-service.ts)
 */
export class JobCompletionService {
  // ========== TIME ENTRIES (delegates to JobTimeEntriesService) ==========

  static getTimeEntries(jobId: string): Promise<JobTimeEntry[]> {
    return JobTimeEntriesService.getTimeEntries(jobId)
  }

  static createTimeEntry(input: CreateTimeEntryInput): Promise<JobTimeEntry> {
    return JobTimeEntriesService.createTimeEntry(input, JobVarianceService.updateCompletionVariance)
  }

  static updateTimeEntry(id: string, input: UpdateTimeEntryInput): Promise<JobTimeEntry> {
    return JobTimeEntriesService.updateTimeEntry(id, input, JobVarianceService.updateCompletionVariance)
  }

  static deleteTimeEntry(id: string): Promise<void> {
    return JobTimeEntriesService.deleteTimeEntry(id, JobVarianceService.updateCompletionVariance)
  }

  // ========== MATERIAL USAGE (delegates to JobMaterialsService) ==========

  static getMaterialUsage(jobId: string): Promise<JobMaterialUsage[]> {
    return JobMaterialsService.getMaterialUsage(jobId)
  }

  static createMaterialUsage(input: CreateMaterialUsageInput): Promise<JobMaterialUsage> {
    return JobMaterialsService.createMaterialUsage(input, JobVarianceService.updateCompletionVariance)
  }

  static updateMaterialUsage(id: string, input: UpdateMaterialUsageInput): Promise<JobMaterialUsage> {
    return JobMaterialsService.updateMaterialUsage(id, input, JobVarianceService.updateCompletionVariance)
  }

  static deleteMaterialUsage(id: string): Promise<void> {
    return JobMaterialsService.deleteMaterialUsage(id, JobVarianceService.updateCompletionVariance)
  }

  // ========== COMPLETION PHOTOS (delegates to JobCompletionPhotosService) ==========

  static getPhotos(jobId: string): Promise<JobCompletionPhoto[]> {
    return JobCompletionPhotosService.getPhotos(jobId)
  }

  static createPhoto(input: CreateCompletionPhotoInput): Promise<JobCompletionPhoto> {
    return JobCompletionPhotosService.createPhoto(input)
  }

  static updatePhoto(id: string, input: UpdateCompletionPhotoInput): Promise<JobCompletionPhoto> {
    return JobCompletionPhotosService.updatePhoto(id, input)
  }

  static deletePhoto(id: string): Promise<void> {
    return JobCompletionPhotosService.deletePhoto(id)
  }

  static uploadPhoto(
    jobId: string,
    organizationId: string,
    file: File,
  ): Promise<{ url: string; path: string }> {
    return JobCompletionPhotosService.uploadPhoto(jobId, organizationId, file)
  }

  // ========== CHECKLISTS (delegates to JobChecklistService) ==========

  static getChecklist(jobId: string): Promise<JobCompletionChecklist[]> {
    return JobChecklistService.getChecklist(jobId)
  }

  static getChecklistGrouped(jobId: string): Promise<GroupedChecklists> {
    return JobChecklistService.getChecklistGrouped(jobId)
  }

  static initializeChecklist(jobId: string): Promise<JobCompletionChecklist[]> {
    return JobChecklistService.initializeChecklist(jobId)
  }

  static toggleChecklistItem(
    id: string,
    completed: boolean,
    notes?: string,
  ): Promise<JobCompletionChecklist> {
    return JobChecklistService.toggleChecklistItem(id, completed, notes)
  }

  static updateChecklistItem(
    id: string,
    input: UpdateChecklistItemInput,
  ): Promise<JobCompletionChecklist> {
    return JobChecklistService.updateChecklistItem(id, input)
  }

  // ========== VARIANCE ANALYSIS (delegates to JobVarianceService) ==========

  static updateCompletionVariance(jobId: string): Promise<void> {
    return JobVarianceService.updateCompletionVariance(jobId)
  }

  static updateCompletionVarianceBatch(jobIds: string[]): Promise<void> {
    return JobVarianceService.updateCompletionVarianceBatch(jobIds)
  }

  static getVarianceAnalysis(filters?: VarianceFilters): Promise<VarianceAnalysis[]> {
    return JobVarianceService.getVarianceAnalysis(filters)
  }

  static getVarianceSummary(filters?: VarianceFilters): Promise<VarianceSummary> {
    return JobVarianceService.getVarianceSummary(filters)
  }

  // ========== JOB COMPLETIONS (core lifecycle — stays here) ==========

  static async getCompletion(jobId: string): Promise<JobCompletion | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('job_completions')
      .select(`
        *,
        submitter:profiles!job_completions_submitted_by_fkey(id, full_name),
        reviewer:profiles!job_completions_reviewed_by_fkey(id, full_name)
      `)
      .eq('job_id', jobId)
      .single()

    if (error && error.code !== 'PGRST116') throwDbError(error, 'fetch job completion')

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

    if (!user) throw new SecureError('UNAUTHORIZED')

    const existing = await JobCompletionService.getCompletion(input.job_id)
    if (existing) {
      return existing
    }

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

    if (error) throwDbError(error, 'create job completion')

    await supabase
      .from('jobs')
      .update({ completion_id: data.id })
      .eq('id', input.job_id)

    await JobVarianceService.updateCompletionVariance(input.job_id)

    await Activity.created('job_completion', data.id, job?.job_number)

    return data
  }

  static async updateCompletion(
    jobId: string,
    input: UpdateCompletionInput,
  ): Promise<JobCompletion> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

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

    if (error) throwDbError(error, 'update job completion')

    await Activity.updated('job_completion', data.id)

    return data
  }

  static async submitCompletion(
    jobId: string,
    input?: SubmitCompletionInput,
  ): Promise<JobCompletion> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    await JobVarianceService.updateCompletionVariance(jobId)

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

    if (error) throwDbError(error, 'update job completion')

    await Activity.statusChanged('job_completion', data.id, undefined, 'draft', 'submitted')

    return data
  }

  static async approveCompletion(
    jobId: string,
    input?: ApproveCompletionInput,
  ): Promise<JobCompletion> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

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

    if (error) throwDbError(error, 'update job completion')

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
    input: RejectCompletionInput,
  ): Promise<JobCompletion> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

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

    if (error) throwDbError(error, 'update job completion')

    await Activity.statusChanged('job_completion', data.id, undefined, 'submitted', 'rejected')

    return data
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
      JobTimeEntriesService.getTimeEntries(jobId),
      JobMaterialsService.getMaterialUsage(jobId),
      JobCompletionPhotosService.getPhotos(jobId),
      JobChecklistService.getChecklistGrouped(jobId),
      JobCompletionService.getCompletion(jobId),
    ])

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

// Re-export extracted services for direct usage
export { JobTimeEntriesService } from '@/lib/services/job-time-entries-service'
export { JobMaterialsService } from '@/lib/services/job-materials-service'
export { JobCompletionPhotosService } from '@/lib/services/job-completion-photos-service'
export { JobChecklistService } from '@/lib/services/job-checklist-service'
export { JobVarianceService } from '@/lib/services/job-variance-service'
