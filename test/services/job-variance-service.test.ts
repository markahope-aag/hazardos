import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateClient = vi.fn()
const mockGetCurrentUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ createClient: () => mockCreateClient() }))
vi.mock('@/lib/auth/server-auth', () => ({ getCurrentUser: () => mockGetCurrentUser() }))

const { JobVarianceService } = await import('@/lib/services/job-variance-service')

/**
 * Job variance drives profitability/margin reporting - getVarianceSummary buckets
 * jobs as over/under/on-target budget and averages the variance across them, so a
 * wrong bucket or a wrong average misreports whether jobs made money. This file
 * had zero coverage.
 *
 * Note: the raw cost/hours variance percentages (division by estimated cost) are
 * computed in a Postgres RPC (calculate_completion_variance), not in this file -
 * this file only consumes and aggregates the already-computed values. So the
 * classic "variance % divide by zero" risk lives in the DB layer, out of scope
 * for these tests.
 */

interface Completion {
  id?: string
  status?: string
  reviewed_at?: string | null
  estimated_hours?: number | null
  actual_hours?: number | null
  hours_variance?: number | null
  hours_variance_percent?: number | null
  estimated_total?: number | null
  actual_total?: number | null
  cost_variance?: number | null
  cost_variance_percent?: number | null
  cost_variance_percent_missing?: boolean
  job: {
    id: string
    job_number: string
    name?: string | null
    customer_id?: string
    customer?: { name?: string; company_name?: string } | null
    hazard_types?: string[]
  }
}

interface Material {
  job_id: string
  material_name: string
  quantity_estimated: number | null
  quantity_used: number
  variance_quantity: number | null
  variance_percent: number | null
  unit: string | null
}

interface Options {
  completions?: Completion[]
  materials?: Material[]
  userId?: string | null
  completionsError?: { message: string; code?: string } | null
  rpcError?: { message: string } | null
  /** undefined = use `completions` for the select; string/null = fallback lookup result */
  fallbackCompletionId?: string | null | undefined
}

function makeQueryNode(resolveValue: { data: unknown; error: unknown }) {
  const node: Record<string, unknown> = {
    eq: vi.fn(() => node),
    gte: vi.fn(() => node),
    lte: vi.fn(() => node),
    order: vi.fn().mockResolvedValue(resolveValue),
    single: vi.fn().mockResolvedValue(resolveValue),
    in: vi.fn().mockResolvedValue(resolveValue),
  }
  return node
}

function setup(options: Options = {}) {
  const {
    completions = [],
    materials = [],
    userId = 'user-1',
    completionsError = null,
    rpcError = null,
    fallbackCompletionId = undefined,
  } = options

  const rpc = vi.fn().mockResolvedValue({ data: null, error: rpcError })

  const supabase = {
    rpc,
    from: vi.fn((table: string) => {
      if (table === 'job_completions') {
        return {
          select: vi.fn(() =>
            makeQueryNode(
              fallbackCompletionId === undefined
                ? { data: completions, error: completionsError }
                : { data: fallbackCompletionId ? { id: fallbackCompletionId } : null, error: null }
            )
          ),
        }
      }
      if (table === 'job_material_usage') {
        return {
          select: vi.fn(() => makeQueryNode({ data: materials, error: null })),
        }
      }
      return {}
    }),
  }

  mockCreateClient.mockResolvedValue(supabase)
  mockGetCurrentUser.mockResolvedValue(userId ? { id: userId } : null)

  return { supabase, rpc }
}

function completion(overrides: Partial<Completion> = {}): Completion {
  return {
    id: 'completion-1',
    status: 'approved',
    reviewed_at: '2026-08-01T00:00:00Z',
    estimated_hours: 40,
    actual_hours: 44,
    hours_variance: 4,
    hours_variance_percent: 10,
    estimated_total: 10000,
    actual_total: 11000,
    cost_variance: 1000,
    cost_variance_percent: 10,
    job: {
      id: 'job-1',
      job_number: 'JOB-2026-001',
      name: 'Asbestos Removal',
      customer_id: 'cust-1',
      customer: { name: 'Jane Doe', company_name: null },
      hazard_types: ['asbestos'],
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('JobVarianceService.getVarianceAnalysis - auth', () => {
  it('throws UNAUTHORIZED when there is no current user', async () => {
    setup({ userId: null })
    await expect(JobVarianceService.getVarianceAnalysis()).rejects.toThrow()
  })
})

describe('JobVarianceService.getVarianceAnalysis - mapping', () => {
  it('maps estimated/actual/variance fields straight through from the completion', async () => {
    setup({ completions: [completion()] })
    const [result] = await JobVarianceService.getVarianceAnalysis()

    expect(result.estimated_hours).toBe(40)
    expect(result.actual_hours).toBe(44)
    expect(result.hours_variance).toBe(4)
    expect(result.hours_variance_percent).toBe(10)
    expect(result.estimated_cost).toBe(10000)
    expect(result.actual_cost).toBe(11000)
    expect(result.cost_variance).toBe(1000)
    expect(result.cost_variance_percent).toBe(10)
  })

  it('prefers the company name over the personal name for a commercial customer', async () => {
    setup({
      completions: [
        completion({ job: { ...completion().job, customer: { name: 'Jane Doe', company_name: 'Acme Corp' } } }),
      ],
    })
    const [result] = await JobVarianceService.getVarianceAnalysis()
    expect(result.customer_name).toBe('Acme Corp')
  })

  it('falls back to the personal name when there is no company name', async () => {
    setup({ completions: [completion()] })
    const [result] = await JobVarianceService.getVarianceAnalysis()
    expect(result.customer_name).toBe('Jane Doe')
  })

  it('reports "Unknown" when the completion has no customer at all', async () => {
    setup({ completions: [completion({ job: { ...completion().job, customer: null } })] })
    const [result] = await JobVarianceService.getVarianceAnalysis()
    expect(result.customer_name).toBe('Unknown')
  })

  it('attaches only the materials belonging to that job', async () => {
    setup({
      completions: [completion({ job: { ...completion().job, id: 'job-1' } })],
      materials: [
        { job_id: 'job-1', material_name: 'Poly sheeting', quantity_estimated: 100, quantity_used: 120, variance_quantity: 20, variance_percent: 20, unit: 'sqft' },
        { job_id: 'job-2', material_name: 'Tape', quantity_estimated: 10, quantity_used: 10, variance_quantity: 0, variance_percent: 0, unit: 'rolls' },
      ],
    })
    const [result] = await JobVarianceService.getVarianceAnalysis()
    expect(result.materials_summary).toHaveLength(1)
    expect(result.materials_summary[0]).toEqual({
      material_name: 'Poly sheeting',
      estimated_qty: 100,
      actual_qty: 120,
      variance_qty: 20,
      variance_percent: 20,
      unit: 'sqft',
    })
  })

  it('returns an empty materials_summary when no materials were logged for the job', async () => {
    setup({ completions: [completion()], materials: [] })
    const [result] = await JobVarianceService.getVarianceAnalysis()
    expect(result.materials_summary).toEqual([])
  })

  it('returns an empty array when there are no approved completions', async () => {
    setup({ completions: [] })
    const result = await JobVarianceService.getVarianceAnalysis()
    expect(result).toEqual([])
  })
})

describe('JobVarianceService.getVarianceAnalysis - filters', () => {
  it('filters by customer_id using the job customer, not the job id (regression: J-customer-filter bug)', async () => {
    setup({
      completions: [
        completion({ job: { ...completion().job, id: 'job-1', customer_id: 'cust-1' } }),
        completion({ job: { ...completion().job, id: 'job-2', customer_id: 'cust-2' } }),
      ],
    })
    const result = await JobVarianceService.getVarianceAnalysis({ customer_id: 'cust-2' })
    expect(result).toHaveLength(1)
    expect(result[0].job_id).toBe('job-2')
  })

  it('filters by hazard_types, matching if any requested hazard is present on the job', async () => {
    setup({
      completions: [
        completion({ job: { ...completion().job, id: 'job-1', hazard_types: ['asbestos'] } }),
        completion({ job: { ...completion().job, id: 'job-2', hazard_types: ['lead'] } }),
      ],
    })
    const result = await JobVarianceService.getVarianceAnalysis({ hazard_types: ['lead', 'mold'] })
    expect(result).toHaveLength(1)
    expect(result[0].job_id).toBe('job-2')
  })

  it('excludes jobs with no hazard_types when a hazard_types filter is set', async () => {
    setup({
      completions: [completion({ job: { ...completion().job, hazard_types: [] } })],
    })
    const result = await JobVarianceService.getVarianceAnalysis({ hazard_types: ['asbestos'] })
    expect(result).toEqual([])
  })

  it('filters by variance_threshold using the absolute value of cost_variance_percent (positive)', async () => {
    setup({
      completions: [
        completion({ job: { ...completion().job, id: 'job-1' }, cost_variance_percent: 5 }),
        completion({ job: { ...completion().job, id: 'job-2' }, cost_variance_percent: 15 }),
      ],
    })
    const result = await JobVarianceService.getVarianceAnalysis({ variance_threshold: 10 })
    expect(result).toHaveLength(1)
    expect(result[0].job_id).toBe('job-2')
  })

  it('filters by variance_threshold on the negative (under-budget) side too', async () => {
    setup({
      completions: [
        completion({ job: { ...completion().job, id: 'job-1' }, cost_variance_percent: -5 }),
        completion({ job: { ...completion().job, id: 'job-2' }, cost_variance_percent: -15 }),
      ],
    })
    const result = await JobVarianceService.getVarianceAnalysis({ variance_threshold: 10 })
    expect(result).toHaveLength(1)
    expect(result[0].job_id).toBe('job-2')
  })

  it('treats a missing cost_variance_percent as 0 when applying the threshold filter', async () => {
    setup({
      completions: [completion({ cost_variance_percent: null })],
    })
    const result = await JobVarianceService.getVarianceAnalysis({ variance_threshold: 1 })
    expect(result).toEqual([])
  })
})

describe('JobVarianceService.getVarianceSummary - bucketing', () => {
  it('counts a job over budget only when variance exceeds +10%', async () => {
    setup({
      completions: [
        completion({ job: { ...completion().job, id: 'job-1' }, cost_variance_percent: 11 }),
      ],
    })
    const summary = await JobVarianceService.getVarianceSummary()
    expect(summary.over_budget_count).toBe(1)
    expect(summary.under_budget_count).toBe(0)
    expect(summary.on_target_count).toBe(0)
  })

  it('counts a job under budget only when variance is below -10%', async () => {
    setup({
      completions: [
        completion({ job: { ...completion().job, id: 'job-1' }, cost_variance_percent: -11 }),
      ],
    })
    const summary = await JobVarianceService.getVarianceSummary()
    expect(summary.over_budget_count).toBe(0)
    expect(summary.under_budget_count).toBe(1)
    expect(summary.on_target_count).toBe(0)
  })

  it('treats a variance exactly at the +/-10% threshold as on target, not over/under', async () => {
    setup({
      completions: [
        completion({ job: { ...completion().job, id: 'job-1' }, cost_variance_percent: 10 }),
        completion({ job: { ...completion().job, id: 'job-2' }, cost_variance_percent: -10 }),
      ],
    })
    const summary = await JobVarianceService.getVarianceSummary()
    expect(summary.on_target_count).toBe(2)
    expect(summary.over_budget_count).toBe(0)
    expect(summary.under_budget_count).toBe(0)
  })

  it('treats a missing cost_variance_percent as on target (0)', async () => {
    setup({ completions: [completion({ cost_variance_percent: null })] })
    const summary = await JobVarianceService.getVarianceSummary()
    expect(summary.on_target_count).toBe(1)
  })

  it('buckets a mix of jobs correctly across all three categories', async () => {
    setup({
      completions: [
        completion({ job: { ...completion().job, id: 'job-1' }, cost_variance_percent: 25 }),
        completion({ job: { ...completion().job, id: 'job-2' }, cost_variance_percent: -25 }),
        completion({ job: { ...completion().job, id: 'job-3' }, cost_variance_percent: 2 }),
      ],
    })
    const summary = await JobVarianceService.getVarianceSummary()
    expect(summary.total_jobs).toBe(3)
    expect(summary.over_budget_count).toBe(1)
    expect(summary.under_budget_count).toBe(1)
    expect(summary.on_target_count).toBe(1)
  })
})

describe('JobVarianceService.getVarianceSummary - aggregation math', () => {
  it('returns all zeros without dividing by zero when there are no jobs', async () => {
    setup({ completions: [] })
    const summary = await JobVarianceService.getVarianceSummary()
    expect(summary).toEqual({
      total_jobs: 0,
      over_budget_count: 0,
      under_budget_count: 0,
      on_target_count: 0,
      avg_hours_variance: 0,
      avg_cost_variance: 0,
      total_hours_variance: 0,
      total_cost_variance: 0,
    })
  })

  it('sums and averages hours/cost variance across multiple jobs', async () => {
    setup({
      completions: [
        completion({ job: { ...completion().job, id: 'job-1' }, hours_variance: 4, cost_variance: 1000 }),
        completion({ job: { ...completion().job, id: 'job-2' }, hours_variance: -2, cost_variance: -500 }),
      ],
    })
    const summary = await JobVarianceService.getVarianceSummary()
    expect(summary.total_hours_variance).toBe(2)
    expect(summary.total_cost_variance).toBe(500)
    expect(summary.avg_hours_variance).toBe(1)
    expect(summary.avg_cost_variance).toBe(250)
  })

  it('treats null hours_variance/cost_variance as 0 in the sums', async () => {
    setup({
      completions: [
        completion({ job: { ...completion().job, id: 'job-1' }, hours_variance: null, cost_variance: null }),
        completion({ job: { ...completion().job, id: 'job-2' }, hours_variance: 6, cost_variance: 900 }),
      ],
    })
    const summary = await JobVarianceService.getVarianceSummary()
    expect(summary.total_hours_variance).toBe(6)
    expect(summary.total_cost_variance).toBe(900)
    expect(summary.avg_hours_variance).toBe(3)
    expect(summary.avg_cost_variance).toBe(450)
  })

  it('does not round the average - callers get the full-precision value', async () => {
    setup({
      completions: [
        completion({ job: { ...completion().job, id: 'job-1' }, cost_variance: 100 }),
        completion({ job: { ...completion().job, id: 'job-2' }, cost_variance: 100 }),
        completion({ job: { ...completion().job, id: 'job-3' }, cost_variance: 100 }),
      ],
    })
    const summary = await JobVarianceService.getVarianceSummary()
    expect(summary.avg_cost_variance).toBeCloseTo(100, 10)
  })
})

describe('JobVarianceService.updateCompletionVariance', () => {
  it('does not fall back when the RPC succeeds', async () => {
    const { supabase } = setup({ rpcError: null })
    await JobVarianceService.updateCompletionVariance('job-1')
    expect(supabase.rpc).toHaveBeenCalledWith('calculate_completion_variance_by_job', { p_job_id: 'job-1' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('falls back to the legacy per-completion RPC when the batch RPC errors', async () => {
    const { supabase } = setup({ rpcError: { message: 'function does not exist' }, fallbackCompletionId: 'completion-9' })
    await JobVarianceService.updateCompletionVariance('job-1')
    expect(supabase.rpc).toHaveBeenCalledWith('calculate_completion_variance', { p_completion_id: 'completion-9' })
  })

  it('does not call the legacy RPC when the fallback finds no completion for the job', async () => {
    const { supabase } = setup({ rpcError: { message: 'boom' }, fallbackCompletionId: null })
    await JobVarianceService.updateCompletionVariance('job-1')
    expect(supabase.rpc).toHaveBeenCalledTimes(1)
  })
})

describe('JobVarianceService.updateCompletionVarianceBatch', () => {
  it('is a no-op for an empty job list', async () => {
    const { supabase } = setup()
    await JobVarianceService.updateCompletionVarianceBatch([])
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('updates variance for every job id given', async () => {
    const { supabase } = setup({ rpcError: null })
    await JobVarianceService.updateCompletionVarianceBatch(['job-1', 'job-2', 'job-3'])
    expect(supabase.rpc).toHaveBeenCalledTimes(3)
  })
})
