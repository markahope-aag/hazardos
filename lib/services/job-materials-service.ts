import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import type {
  JobMaterialUsage,
  CreateMaterialUsageInput,
  UpdateMaterialUsageInput,
} from '@/types/job-completion'

export class JobMaterialsService {
  static async getMaterialUsage(jobId: string): Promise<JobMaterialUsage[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('job_material_usage')
      .select(`
        *,
        creator:profiles!job_material_usage_created_by_fkey(id, full_name)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (error) throwDbError(error, 'fetch material usage')

    return (data || []).map(usage => ({
      ...usage,
      creator: Array.isArray(usage.creator) ? usage.creator[0] : usage.creator,
    }))
  }

  static async createMaterialUsage(
    input: CreateMaterialUsageInput,
    updateVariance: (jobId: string) => Promise<void>,
  ): Promise<JobMaterialUsage> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

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

    if (error) throwDbError(error, 'create material usage')

    await updateVariance(input.job_id)
    await Activity.created('material_usage', data.id, input.material_name)

    return data
  }

  static async updateMaterialUsage(
    id: string,
    input: UpdateMaterialUsageInput,
    updateVariance: (jobId: string) => Promise<void>,
  ): Promise<JobMaterialUsage> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('job_material_usage')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throwDbError(error, 'update material usage')

    await updateVariance(data.job_id)
    await Activity.updated('material_usage', data.id, data.material_name)

    return data
  }

  static async deleteMaterialUsage(
    id: string,
    updateVariance: (jobId: string) => Promise<void>,
  ): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: usage } = await supabase
      .from('job_material_usage')
      .select('job_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('job_material_usage')
      .delete()
      .eq('id', id)

    if (error) throwDbError(error, 'delete material usage')

    if (usage) {
      await updateVariance(usage.job_id)
    }

    await Activity.deleted('material_usage', id)
  }
}
