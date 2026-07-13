import { describe, it, expect } from 'vitest'
import { aggregateEstimatorAccuracy } from '@/lib/utils/estimator-accuracy'

describe('aggregateEstimatorAccuracy', () => {
  it('returns an empty array for no input', () => {
    expect(aggregateEstimatorAccuracy([])).toEqual([])
  })

  it('averages accuracy as 100 minus the absolute variance', () => {
    const [row] = aggregateEstimatorAccuracy([
      { estimatorId: 'e1', estimatorName: 'Jane', costVariancePercent: 10 },
      { estimatorId: 'e1', estimatorName: 'Jane', costVariancePercent: -20 },
    ])
    // accuracy = (90 + 80) / 2 = 85
    expect(row.avg_accuracy_pct).toBe(85)
    expect(row.jobs_count).toBe(2)
    // signed variance = (10 + -20) / 2 = -5
    expect(row.avg_variance_pct).toBe(-5)
  })

  it('clamps accuracy at zero when variance exceeds 100%', () => {
    const [row] = aggregateEstimatorAccuracy([
      { estimatorId: 'e1', estimatorName: 'Jane', costVariancePercent: 150 },
    ])
    expect(row.avg_accuracy_pct).toBe(0)
  })

  it('flags a consistent under-estimator (actuals exceed the quote)', () => {
    const [row] = aggregateEstimatorAccuracy([
      { estimatorId: 'e1', estimatorName: 'Jane', costVariancePercent: 12 },
      { estimatorId: 'e1', estimatorName: 'Jane', costVariancePercent: 8 },
    ])
    expect(row.tendency).toBe('underestimates')
  })

  it('flags a consistent over-estimator', () => {
    const [row] = aggregateEstimatorAccuracy([
      { estimatorId: 'e1', estimatorName: 'Jane', costVariancePercent: -12 },
    ])
    expect(row.tendency).toBe('overestimates')
  })

  it('treats small variance as accurate', () => {
    const [row] = aggregateEstimatorAccuracy([
      { estimatorId: 'e1', estimatorName: 'Jane', costVariancePercent: 3 },
      { estimatorId: 'e1', estimatorName: 'Jane', costVariancePercent: -2 },
    ])
    expect(row.tendency).toBe('accurate')
  })

  it('groups by estimator and sorts by job count then accuracy', () => {
    const rows = aggregateEstimatorAccuracy([
      { estimatorId: 'e1', estimatorName: 'Jane', costVariancePercent: 5 },
      { estimatorId: 'e2', estimatorName: 'Bob', costVariancePercent: 4 },
      { estimatorId: 'e2', estimatorName: 'Bob', costVariancePercent: 6 },
    ])
    expect(rows.map((r) => r.estimator_id)).toEqual(['e2', 'e1'])
    expect(rows[0].jobs_count).toBe(2)
  })

  it('falls back to "Unknown" when no name is provided', () => {
    const [row] = aggregateEstimatorAccuracy([
      { estimatorId: 'e1', estimatorName: null, costVariancePercent: 0 },
    ])
    expect(row.estimator_name).toBe('Unknown')
  })
})
