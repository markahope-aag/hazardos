// PA9 — per-estimator estimate-accuracy ("pattern learning").
//
// Accuracy is derived from each completed job's cost variance: how far the
// actual total landed from the estimate. Rolled up per estimator, a
// consistent signed bias is the "pattern" — e.g. an estimator who reliably
// under-estimates by ~12% can have future quotes nudged up.

// A completion counts as "on target" when its cost variance is within this
// many percent of the estimate, in either direction.
export const ON_TARGET_THRESHOLD_PCT = 5

export type EstimatorTendency = 'underestimates' | 'overestimates' | 'accurate'

export interface EstimatorAccuracyInput {
  estimatorId: string
  estimatorName: string | null
  // Signed cost variance percent: positive = actual exceeded the estimate
  // (under-estimated), negative = came in under the estimate.
  costVariancePercent: number
}

export interface EstimatorAccuracyRow {
  estimator_id: string
  estimator_name: string
  jobs_count: number
  // Mean of per-job accuracy, where accuracy = max(0, 100 - |variance|).
  avg_accuracy_pct: number
  // Mean of the signed variance — reveals directional bias.
  avg_variance_pct: number
  tendency: EstimatorTendency
}

function tendencyFor(avgVariancePct: number): EstimatorTendency {
  if (avgVariancePct > ON_TARGET_THRESHOLD_PCT) return 'underestimates'
  if (avgVariancePct < -ON_TARGET_THRESHOLD_PCT) return 'overestimates'
  return 'accurate'
}

/**
 * Group per-job cost variances by estimator into accuracy rows, sorted by
 * job count (most-measured first), then by accuracy.
 */
export function aggregateEstimatorAccuracy(
  inputs: EstimatorAccuracyInput[],
): EstimatorAccuracyRow[] {
  const groups = new Map<
    string,
    { name: string | null; accuracySum: number; varianceSum: number; count: number }
  >()

  for (const input of inputs) {
    const accuracy = Math.max(0, 100 - Math.abs(input.costVariancePercent))
    const group = groups.get(input.estimatorId) ?? {
      name: input.estimatorName,
      accuracySum: 0,
      varianceSum: 0,
      count: 0,
    }
    group.accuracySum += accuracy
    group.varianceSum += input.costVariancePercent
    group.count += 1
    // Prefer a non-null name if a later row supplies one.
    if (!group.name && input.estimatorName) group.name = input.estimatorName
    groups.set(input.estimatorId, group)
  }

  const rows: EstimatorAccuracyRow[] = [...groups.entries()].map(([id, g]) => {
    const avgVariance = g.varianceSum / g.count
    return {
      estimator_id: id,
      estimator_name: g.name || 'Unknown',
      jobs_count: g.count,
      avg_accuracy_pct: Math.round((g.accuracySum / g.count) * 10) / 10,
      avg_variance_pct: Math.round(avgVariance * 10) / 10,
      tendency: tendencyFor(avgVariance),
    }
  })

  rows.sort((a, b) => b.jobs_count - a.jobs_count || b.avg_accuracy_pct - a.avg_accuracy_pct)
  return rows
}
