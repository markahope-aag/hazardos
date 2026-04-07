import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import type {
  JobCompletionChecklist,
  UpdateChecklistItemInput,
  GroupedChecklists,
  ChecklistCategory,
} from '@/types/job-completion'

export class JobChecklistService {
  static async getChecklist(jobId: string): Promise<JobCompletionChecklist[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('job_completion_checklists')
      .select(`
        *,
        completer:profiles!job_completion_checklists_completed_by_fkey(id, full_name)
      `)
      .eq('job_id', jobId)
      .order('category')
      .order('sort_order')

    if (error) throwDbError(error, 'fetch checklist items')

    return (data || []).map(item => ({
      ...item,
      completer: Array.isArray(item.completer) ? item.completer[0] : item.completer,
    }))
  }

  static async getChecklistGrouped(jobId: string): Promise<GroupedChecklists> {
    const items = await JobChecklistService.getChecklist(jobId)

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

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { count } = await supabase
      .from('job_completion_checklists')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)

    if (count && count > 0) {
      return JobChecklistService.getChecklist(jobId)
    }

    const { error } = await supabase.rpc('initialize_job_checklist', {
      p_job_id: jobId,
    })

    if (error) throwDbError(error, 'create checklist')

    await Activity.created('checklist', jobId, 'Job checklist initialized')

    return JobChecklistService.getChecklist(jobId)
  }

  static async toggleChecklistItem(
    id: string,
    completed: boolean,
    notes?: string,
  ): Promise<JobCompletionChecklist> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

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

    if (error) throwDbError(error, 'update checklist item')

    return data
  }

  static async updateChecklistItem(
    id: string,
    input: UpdateChecklistItemInput,
  ): Promise<JobCompletionChecklist> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

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

    if (error) throwDbError(error, 'update checklist item')

    return data
  }
}
