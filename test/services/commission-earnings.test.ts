import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateClient = vi.fn()
const mockGetCurrentUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ createClient: () => mockCreateClient() }))
vi.mock('@/lib/auth/server-auth', () => ({ getCurrentUser: () => mockGetCurrentUser() }))
vi.mock('@/lib/services/activity-service', () => ({ Activity: { log: vi.fn() } }))

const { CommissionService } = await import('@/lib/services/commission-service')

/**
 * The commission paths that decide whether a sales rep gets paid, and how much.
 *
 * `createEarningForJob` (CO2) fires when a job completes and had no coverage at
 * all. Everything it does is a decision about money leaving the business: which
 * rep is credited, which plan applies, what the payout is, and whether a retry
 * pays twice. It is also deliberately best-effort, returning null rather than
 * throwing so it cannot block job completion, which means a silent wrong answer
 * is the failure mode rather than a visible error. That is exactly the shape of
 * bug tests have to catch, because nothing else will.
 *
 * The existing commission-service.test.ts covers plans, listing and summaries
 * through a shared chainable mock. This file uses a per-table mock because these
 * paths read four different tables in sequence and the assertions depend on
 * which one answered what.
 */

interface Tables {
  existingEarning?: { id: string } | null
  job?: Record<string, unknown> | null
  opportunity?: { owner_id: string | null } | null
  profile?: { commission_plan_id: string | null } | null
  plan?: Record<string, unknown> | null
  planError?: { code?: string; message: string } | null
  insertError?: { code?: string; message: string } | null
}

function setup(t: Tables = {}) {
  const {
    existingEarning = null,
    job = {
      id: 'job-1',
      organization_id: 'org-1',
      opportunity_id: null,
      assigned_to: 'rep-assigned',
      created_by: 'user-creator',
      final_amount: 10000,
      actual_revenue: null,
      contract_amount: null,
      estimated_revenue: null,
    },
    opportunity = null,
    profile = { commission_plan_id: 'plan-1' },
    plan = {
      id: 'plan-1',
      commission_type: 'percentage',
      base_rate: 5,
      is_active: true,
      tiers: null,
    },
    planError = null,
    insertError = null,
  } = t

  const captured: { insert?: Record<string, unknown> } = {}

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'commission_earnings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: existingEarning, error: null }),
            })),
          })),
          insert: vi.fn((payload: Record<string, unknown>) => {
            captured.insert = payload
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: insertError ? null : { id: 'earning-new', ...payload },
                  error: insertError,
                }),
              })),
            }
          }),
        }
      }
      const rowFor: Record<string, unknown> = {
        jobs: job,
        opportunities: opportunity,
        profiles: profile,
        commission_plans: plan,
      }
      // Supabase reports "no rows" from .single() as PGRST116, which callers
      // treat as a legitimate null rather than a failure. Using a codeless
      // error here instead would make every absent row look like a broken
      // query.
      const notFound = { code: 'PGRST116', message: 'no rows returned' }
      const errorFor = table === 'commission_plans' && planError ? planError : notFound

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: rowFor[table] ?? null,
              error: rowFor[table] && !(table === 'commission_plans' && planError) ? null : errorFor,
            }),
          })),
        })),
      }
    }),
  }

  mockCreateClient.mockResolvedValue(supabase)
  return { captured }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCurrentUser.mockResolvedValue({ id: 'user-1' })
})

describe('createEarningForJob: who gets credited', () => {
  it('credits the opportunity owner over the job assignee', async () => {
    // The owner is the person who actually sold the work. Crediting the
    // assignee instead would pay the technician who did the removal.
    const { captured } = setup({
      job: {
        id: 'job-1', organization_id: 'org-1', opportunity_id: 'opp-1',
        assigned_to: 'rep-assigned', created_by: 'user-creator',
        final_amount: 10000, actual_revenue: null, contract_amount: null, estimated_revenue: null,
      },
      opportunity: { owner_id: 'rep-owner' },
    })
    await CommissionService.createEarningForJob('job-1')
    expect(captured.insert!.user_id).toBe('rep-owner')
  })

  it('falls back to the assignee when the opportunity has no owner', async () => {
    const { captured } = setup({
      job: {
        id: 'job-1', organization_id: 'org-1', opportunity_id: 'opp-1',
        assigned_to: 'rep-assigned', created_by: 'user-creator',
        final_amount: 10000, actual_revenue: null, contract_amount: null, estimated_revenue: null,
      },
      opportunity: { owner_id: null },
    })
    await CommissionService.createEarningForJob('job-1')
    expect(captured.insert!.user_id).toBe('rep-assigned')
  })

  it('falls back to the creator when there is no assignee', async () => {
    const { captured } = setup({
      job: {
        id: 'job-1', organization_id: 'org-1', opportunity_id: null,
        assigned_to: null, created_by: 'user-creator',
        final_amount: 10000, actual_revenue: null, contract_amount: null, estimated_revenue: null,
      },
    })
    await CommissionService.createEarningForJob('job-1')
    expect(captured.insert!.user_id).toBe('user-creator')
  })

  it('creates nothing when no rep can be resolved', async () => {
    const { captured } = setup({
      job: {
        id: 'job-1', organization_id: 'org-1', opportunity_id: null,
        assigned_to: null, created_by: null,
        final_amount: 10000, actual_revenue: null, contract_amount: null, estimated_revenue: null,
      },
    })
    expect(await CommissionService.createEarningForJob('job-1')).toBeNull()
    expect(captured.insert).toBeUndefined()
  })
})

describe('createEarningForJob: how much', () => {
  const jobWorth = (amounts: Record<string, unknown>) => ({
    id: 'job-1', organization_id: 'org-1', opportunity_id: null,
    assigned_to: 'rep-1', created_by: 'u',
    final_amount: null, actual_revenue: null, contract_amount: null, estimated_revenue: null,
    ...amounts,
  })

  it('pays a percentage plan on the base amount', async () => {
    const { captured } = setup({ plan: { id: 'plan-1', commission_type: 'percentage', base_rate: 5, is_active: true, tiers: null } })
    await CommissionService.createEarningForJob('job-1')
    expect(captured.insert).toMatchObject({ base_amount: 10000, commission_rate: 5, commission_amount: 500 })
  })

  it('pays a flat plan its fixed amount regardless of deal size', async () => {
    // A flat plan stores rate 100 only so the earnings table shows something
    // sensible. If the amount were computed from that rate the rep would be
    // paid the entire contract value.
    const { captured } = setup({ plan: { id: 'plan-1', commission_type: 'flat', base_rate: 750, is_active: true, tiers: null } })
    await CommissionService.createEarningForJob('job-1')
    expect(captured.insert).toMatchObject({ base_amount: 10000, commission_rate: 100, commission_amount: 750 })
  })

  it('picks the tier the base amount falls inside', async () => {
    const { captured } = setup({
      plan: {
        id: 'plan-1', commission_type: 'tiered', base_rate: 0, is_active: true,
        tiers: [
          { min: 0, max: 5000, rate: 2 },
          { min: 5001, max: 20000, rate: 6 },
          { min: 20001, max: null, rate: 10 },
        ],
      },
    })
    await CommissionService.createEarningForJob('job-1')
    expect(captured.insert).toMatchObject({ commission_rate: 6, commission_amount: 600 })
  })

  it('uses the open-ended top tier when max is null', async () => {
    const { captured } = setup({
      job: jobWorth({ final_amount: 50000 }),
      plan: {
        id: 'plan-1', commission_type: 'tiered', base_rate: 0, is_active: true,
        tiers: [{ min: 0, max: 5000, rate: 2 }, { min: 20001, max: null, rate: 10 }],
      },
    })
    await CommissionService.createEarningForJob('job-1')
    expect(captured.insert).toMatchObject({ commission_rate: 10, commission_amount: 5000 })
  })

  it('creates nothing when the amount falls in no tier', async () => {
    const { captured } = setup({
      job: jobWorth({ final_amount: 999999 }),
      plan: {
        id: 'plan-1', commission_type: 'tiered', base_rate: 0, is_active: true,
        tiers: [{ min: 0, max: 5000, rate: 2 }],
      },
    })
    expect(await CommissionService.createEarningForJob('job-1')).toBeNull()
    expect(captured.insert).toBeUndefined()
  })

  it('prefers final_amount over every other revenue figure', async () => {
    const { captured } = setup({
      job: jobWorth({ final_amount: 8000, actual_revenue: 7000, contract_amount: 6000, estimated_revenue: 5000 }),
    })
    await CommissionService.createEarningForJob('job-1')
    expect(captured.insert!.base_amount).toBe(8000)
  })

  it('falls back through actual, contract, then estimated revenue', async () => {
    for (const [amounts, expected] of [
      [{ actual_revenue: 7000, contract_amount: 6000, estimated_revenue: 5000 }, 7000],
      [{ contract_amount: 6000, estimated_revenue: 5000 }, 6000],
      [{ estimated_revenue: 5000 }, 5000],
    ] as const) {
      vi.clearAllMocks()
      const { captured } = setup({ job: jobWorth(amounts) })
      await CommissionService.createEarningForJob('job-1')
      expect(captured.insert!.base_amount).toBe(expected)
    }
  })

  it('creates nothing when the job carries no revenue figure at all', async () => {
    const { captured } = setup({ job: jobWorth({}) })
    expect(await CommissionService.createEarningForJob('job-1')).toBeNull()
    expect(captured.insert).toBeUndefined()
  })

  it('creates nothing for a negative or zero amount', async () => {
    const { captured } = setup({ job: jobWorth({ final_amount: -500 }) })
    expect(await CommissionService.createEarningForJob('job-1')).toBeNull()
    expect(captured.insert).toBeUndefined()
  })

  it('starts every earning pending, never pre-approved', async () => {
    const { captured } = setup({})
    await CommissionService.createEarningForJob('job-1')
    expect(captured.insert!.status).toBe('pending')
  })
})

describe('createEarningForJob: paying twice', () => {
  it('creates nothing when the job already has an earning', async () => {
    // The guard that stops a job completing twice from paying twice.
    const { captured } = setup({ existingEarning: { id: 'earning-existing' } })
    expect(await CommissionService.createEarningForJob('job-1')).toBeNull()
    expect(captured.insert).toBeUndefined()
  })

  it('treats a unique-violation race as success rather than an error', async () => {
    // Two concurrent callers can both pass the existence check. The partial
    // unique index turns the loser into a 23505, which must NOT surface as a
    // failure and must NOT produce a second payout.
    setup({ insertError: { code: '23505', message: 'duplicate key' } })
    expect(await CommissionService.createEarningForJob('job-1')).toBeNull()
  })

  it('still throws on a non-race insert failure', async () => {
    // A permissions or constraint failure is a real problem and must not be
    // swallowed by the idempotency handling above.
    setup({ insertError: { code: '42501', message: 'permission denied' } })
    await expect(CommissionService.createEarningForJob('job-1')).rejects.toThrow()
  })
})

describe('createEarningForJob: preconditions', () => {
  it('creates nothing when the job does not exist', async () => {
    const { captured } = setup({ job: null })
    expect(await CommissionService.createEarningForJob('missing')).toBeNull()
    expect(captured.insert).toBeUndefined()
  })

  it('creates nothing when the rep has no commission plan', async () => {
    const { captured } = setup({ profile: { commission_plan_id: null } })
    expect(await CommissionService.createEarningForJob('job-1')).toBeNull()
    expect(captured.insert).toBeUndefined()
  })

  it('creates nothing when the plan is inactive', async () => {
    // An archived plan must not keep paying out after it is retired.
    const { captured } = setup({
      plan: { id: 'plan-1', commission_type: 'percentage', base_rate: 5, is_active: false, tiers: null },
    })
    expect(await CommissionService.createEarningForJob('job-1')).toBeNull()
    expect(captured.insert).toBeUndefined()
  })

  it('creates nothing when the plan row is absent', async () => {
    // A missing row comes back as PGRST116, which getPlan maps to null.
    const { captured } = setup({ plan: null })
    expect(await CommissionService.createEarningForJob('job-1')).toBeNull()
    expect(captured.insert).toBeUndefined()
  })

  it('surfaces a genuine plan lookup failure instead of silently paying nothing', async () => {
    // The distinction matters: "this rep has no plan" is a normal outcome and
    // returns null, but a broken query must not be indistinguishable from it,
    // or a database problem would quietly stop everyone's commission.
    setup({ planError: { code: '42501', message: 'permission denied' } })
    await expect(CommissionService.createEarningForJob('job-1')).rejects.toThrow()
  })
})
