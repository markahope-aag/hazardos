import { createClient } from '@/lib/supabase/server'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import type {
  VarianceAnalysis,
  VarianceFilters,
  VarianceSummary,
} from '@/types/job-completion'

export class JobVarianceService {
  static async updateCompletionVariance(jobId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.rpc('calculate_completion_variance_by_job', {
      p_job_id: jobId,
    })

    // Fall back to legacy 2-query pattern if the new RPC doesn't exist
    if (error) {
      const { data: completion } = await supabase
        .from('job_completions')
        .select('id')
        .eq('job_id', jobId)
        .single()

      if (completion) {
        await supabase.rpc('calculate_completion_variance', {
          p_completion_id: completion.id,
        })
      }
    }
  }

  static async updateCompletionVarianceBatch(jobIds: string[]): Promise<void> {
    if (jobIds.length === 0) return

    await Promise.all(
      jobIds.map(jobId => JobVarianceService.updateCompletionVariance(jobId))
    )
  }

  static async getVarianceAnalysis(filters?: VarianceFilters): Promise<VarianceAnalysis[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

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

    if (error) throwDbError(error, 'fetch job completions')

    const jobIds = (data || [])
      .map(c => {
        const job = Array.isArray(c.job) ? c.job[0] : c.job
        return job?.id
      })
      .filter((id): id is string => !!id)

    const { data: allMaterials } = await supabase
      .from('job_material_usage')
      .select('job_id, material_name, quantity_estimated, quantity_used, variance_quantity, variance_percent, unit')
      .in('job_id', jobIds.length > 0 ? jobIds : [''])

    const materialsByJobId = new Map<string, typeof allMaterials>()
    for (const material of allMaterials || []) {
      const existing = materialsByJobId.get(material.job_id) || []
      existing.push(material)
      materialsByJobId.set(material.job_id, existing)
    }

    const analyses: VarianceAnalysis[] = []

    for (const completion of data || []) {
      const job = Array.isArray(completion.job) ? completion.job[0] : completion.job
      const customer = job?.customer
        ? (Array.isArray(job.customer) ? job.customer[0] : job.customer)
        : null

      if (filters?.customer_id && job?.id !== filters.customer_id) continue

      if (filters?.hazard_types?.length) {
        const jobHazards = job?.hazard_types || []
        const hasMatch = filters.hazard_types.some((h: string) => jobHazards.includes(h))
        if (!hasMatch) continue
      }

      if (filters?.variance_threshold !== undefined) {
        const variance = Math.abs(completion.cost_variance_percent || 0)
        if (variance < filters.variance_threshold) continue
      }

      const materials = materialsByJobId.get(job?.id) || []

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
        materials_summary: materials.map(m => ({
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
    const analyses = await JobVarianceService.getVarianceAnalysis(filters)

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
}
