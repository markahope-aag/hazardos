import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateClient = vi.fn()
const mockGetCurrentUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ createClient: () => mockCreateClient() }))
vi.mock('@/lib/auth/server-auth', () => ({ getCurrentUser: () => mockGetCurrentUser() }))

const { JobChangeOrdersService } = await import('@/lib/services/job-change-orders-service')

/**
 * Change orders adjust the contract value of a job after it has been sold, so
 * their numbering has to stay unique and readable — it is what a customer and
 * an auditor both cite.
 *
 * This file had no coverage, and the numbering was broken: the counter was read
 * with parseInt on the last '-' segment, which is "CO01", and parseInt('CO01')
 * is NaN. Every change order after the first was named "<job>-CONaN". The
 * numbering tests below exist to keep that from coming back.
 */

interface Options {
  existing?: Array<{ change_order_number: string }>
  jobNumber?: string
  insertError?: { message: string; code?: string } | null
  userId?: string | null
}

function setup(options: Options = {}) {
  const {
    existing = [],
    jobNumber = 'JOB-2026-001',
    insertError = null,
    userId = 'user-1',
  } = options

  const captured: { insert?: Record<string, unknown>; update?: Record<string, unknown> } = {}

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'job_change_orders') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: existing, error: null }),
              })),
            })),
          })),
          insert: vi.fn((payload: Record<string, unknown>) => {
            captured.insert = payload
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: insertError ? null : { id: 'co-1', ...payload },
                  error: insertError,
                }),
              })),
            }
          }),
          update: vi.fn((payload: Record<string, unknown>) => {
            captured.update = payload
            return {
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: insertError ? null : { id: 'co-1', ...payload },
                    error: insertError,
                  }),
                })),
              })),
            }
          }),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { job_number: jobNumber }, error: null }),
          })),
        })),
      }
    }),
  }

  mockCreateClient.mockResolvedValue(supabase)
  mockGetCurrentUser.mockResolvedValue(userId ? { id: userId } : null)

  return { captured }
}

const input = { description: 'Extra containment', reason: 'scope change', amount: 2500 }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('JobChangeOrdersService.add — numbering', () => {
  it('numbers the first change order on a job -CO01', async () => {
    const { captured } = setup({ existing: [] })
    await JobChangeOrdersService.add('job-1', input)
    expect(captured.insert!.change_order_number).toBe('JOB-2026-001-CO01')
  })

  it('increments from the most recent change order', async () => {
    // The regression test. Before the fix this produced "JOB-2026-001-CONaN",
    // because the counter was parsed off "CO01" with parseInt.
    const { captured } = setup({ existing: [{ change_order_number: 'JOB-2026-001-CO01' }] })
    await JobChangeOrdersService.add('job-1', input)
    expect(captured.insert!.change_order_number).toBe('JOB-2026-001-CO02')
  })

  it('never produces NaN in a change order number', async () => {
    const { captured } = setup({ existing: [{ change_order_number: 'JOB-2026-001-CO07' }] })
    await JobChangeOrdersService.add('job-1', input)
    expect(captured.insert!.change_order_number).toBe('JOB-2026-001-CO08')
    expect(String(captured.insert!.change_order_number)).not.toContain('NaN')
  })

  it('keeps two-digit padding and grows past it', async () => {
    const { captured } = setup({ existing: [{ change_order_number: 'JOB-2026-001-CO99' }] })
    await JobChangeOrdersService.add('job-1', input)
    expect(captured.insert!.change_order_number).toBe('JOB-2026-001-CO100')
  })

  it('works when the job number itself contains hyphens', async () => {
    // The original bug was masked in discussion by assuming job numbers had no
    // hyphens. They do, so the suffix must be matched, not split out.
    const { captured } = setup({
      jobNumber: 'ACME-WEST-2026-0042',
      existing: [{ change_order_number: 'ACME-WEST-2026-0042-CO03' }],
    })
    await JobChangeOrdersService.add('job-1', input)
    expect(captured.insert!.change_order_number).toBe('ACME-WEST-2026-0042-CO04')
  })

  it('restarts at 01 when a prior number is malformed rather than emitting NaN', async () => {
    const { captured } = setup({ existing: [{ change_order_number: 'legacy-import' }] })
    await JobChangeOrdersService.add('job-1', input)
    expect(captured.insert!.change_order_number).toBe('JOB-2026-001-CO01')
  })
})

describe('JobChangeOrdersService.add — payload', () => {
  it('stores the amount, description and reason as given', async () => {
    const { captured } = setup({})
    await JobChangeOrdersService.add('job-1', input)
    expect(captured.insert).toMatchObject({
      job_id: 'job-1',
      description: 'Extra containment',
      reason: 'scope change',
      amount: 2500,
    })
  })

  it('starts every change order pending, never pre-approved', async () => {
    // A change order that arrived already approved would move contract value
    // without anyone signing off on it.
    const { captured } = setup({})
    await JobChangeOrdersService.add('job-1', input)
    expect(captured.insert!.status).toBe('pending')
  })

  it('records who created it', async () => {
    const { captured } = setup({ userId: 'user-42' })
    await JobChangeOrdersService.add('job-1', input)
    expect(captured.insert!.created_by).toBe('user-42')
  })

  it('throws when the insert fails', async () => {
    setup({ insertError: { message: 'insert denied', code: '42501' } })
    await expect(JobChangeOrdersService.add('job-1', input)).rejects.toThrow()
  })
})

describe('JobChangeOrdersService.approve / reject', () => {
  it('approve records the approver and a timestamp', async () => {
    const { captured } = setup({ userId: 'approver-9' })
    await JobChangeOrdersService.approve('co-1')
    expect(captured.update).toMatchObject({ status: 'approved', approved_by: 'approver-9' })
    expect(Date.parse(captured.update!.approved_at as string)).not.toBeNaN()
  })

  it('reject sets only the status, leaving approval fields untouched', async () => {
    // Writing approved_by on a rejection would make the audit trail read as
    // though someone approved it.
    const { captured } = setup({})
    await JobChangeOrdersService.reject('co-1')
    expect(captured.update).toEqual({ status: 'rejected' })
  })

  it('approve throws when the update fails', async () => {
    setup({ insertError: { message: 'update denied' } })
    await expect(JobChangeOrdersService.approve('co-1')).rejects.toThrow()
  })

  it('reject throws when the update fails', async () => {
    setup({ insertError: { message: 'update denied' } })
    await expect(JobChangeOrdersService.reject('co-1')).rejects.toThrow()
  })
})
