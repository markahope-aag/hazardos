import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/server-auth'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import {
  aggregateEstimatorAccuracy,
  type EstimatorAccuracyRow,
} from '@/lib/utils/estimator-accuracy'

/**
 * PA9 — per-estimator estimate accuracy. Attributes each completed job's cost
 * variance to the estimator who built the estimate
 * (job_completions → jobs → estimates.created_by) and rolls it up per person.
 *
 * Only approved completions with a computed cost variance are counted, so the
 * actuals are trustworthy. Org scoping is handled by RLS via the server
 * client, matching JobVarianceService.
 */
export class EstimatorAccuracyService {
  static async getEstimatorAccuracy(): Promise<EstimatorAccuracyRow[]> {
    const supabase = await createClient()
    const user = await getCurrentUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('job_completions')
      .select(`
        cost_variance_percent,
        job:jobs!inner(
          estimate:estimates!inner( created_by )
        )
      `)
      .eq('status', 'approved')
      .not('cost_variance_percent', 'is', null)

    if (error) throwDbError(error, 'fetch estimator accuracy')

    const rows = (data || [])
      .map((completion) => {
        const job = Array.isArray(completion.job) ? completion.job[0] : completion.job
        const estimate = job
          ? Array.isArray(job.estimate)
            ? job.estimate[0]
            : job.estimate
          : null
        return {
          createdBy: (estimate?.created_by as string | null) ?? null,
          variance: completion.cost_variance_percent as number | null,
        }
      })
      .filter(
        (r): r is { createdBy: string; variance: number } =>
          !!r.createdBy && r.variance != null,
      )

    const estimatorIds = [...new Set(rows.map((r) => r.createdBy))]

    const nameMap = new Map<string, string | null>()
    if (estimatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', estimatorIds)
      for (const p of profiles || []) nameMap.set(p.id, p.full_name)
    }

    return aggregateEstimatorAccuracy(
      rows.map((r) => ({
        estimatorId: r.createdBy,
        estimatorName: nameMap.get(r.createdBy) ?? null,
        costVariancePercent: r.variance,
      })),
    )
  }
}
