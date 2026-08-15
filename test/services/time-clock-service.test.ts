import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateClient = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient: () => mockCreateClient() }))

const { TimeClockService } = await import('@/lib/services/time-clock-service')

const ORG_ID = 'org-1'
const PROFILE_ID = 'tech-1'

/**
 * Minimal chainable query builder mock. Each `from()` call gets its own
 * queue of query-method calls; the terminal call (single/maybeSingle, or
 * being awaited directly) resolves with whatever this test configured.
 */
function makeSupabase(responses: Record<string, { data: unknown; error: unknown; count?: number }>) {
  const calls: Record<string, unknown>[] = []

  const chain = (table: string) => {
    const response = responses[table] ?? { data: null, error: null }
    const node: Record<string, unknown> = {
      insert: vi.fn((payload: Record<string, unknown>) => {
        calls.push({ table, op: 'insert', payload })
        return node
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        calls.push({ table, op: 'update', payload })
        return node
      }),
      select: vi.fn(() => node),
      eq: vi.fn(() => node),
      is: vi.fn(() => node),
      gte: vi.fn(() => node),
      lte: vi.fn(() => node),
      in: vi.fn(() => node),
      order: vi.fn(() => node),
      single: vi.fn().mockResolvedValue(response),
      maybeSingle: vi.fn().mockResolvedValue(response),
      then: (resolve: (v: unknown) => unknown) => resolve(response),
    }
    return node
  }

  const supabase = { from: vi.fn((table: string) => chain(table)) }
  mockCreateClient.mockResolvedValue(supabase)
  return { supabase, calls }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TimeClockService.clockIn', () => {
  it('inserts an open entry with clock_in set and no job by default', async () => {
    const { calls } = makeSupabase({
      time_clock_entries: { data: { id: 'e1', status: 'open' }, error: null },
    })
    await TimeClockService.clockIn(ORG_ID, PROFILE_ID)
    const insert = calls.find((c) => c.op === 'insert')!.payload as Record<string, unknown>
    expect(insert.organization_id).toBe(ORG_ID)
    expect(insert.profile_id).toBe(PROFILE_ID)
    expect(insert.job_id).toBeNull()
    expect(typeof insert.clock_in).toBe('string')
  })

  it('passes through a job_id when given', async () => {
    const { calls } = makeSupabase({
      time_clock_entries: { data: { id: 'e1', status: 'open' }, error: null },
    })
    await TimeClockService.clockIn(ORG_ID, PROFILE_ID, { job_id: 'job-9' })
    const insert = calls.find((c) => c.op === 'insert')!.payload as Record<string, unknown>
    expect(insert.job_id).toBe('job-9')
  })

  it('turns the one-open-per-profile unique violation into a clear validation error, not a raw 23505', async () => {
    makeSupabase({
      time_clock_entries: { data: null, error: { code: '23505', message: 'duplicate key' } },
    })
    await expect(TimeClockService.clockIn(ORG_ID, PROFILE_ID)).rejects.toThrow(/already clocked in/i)
  })
})

describe('TimeClockService.clockOut', () => {
  it('scopes the update to the entry id AND the caller profile id — cannot close someone else\'s clock', async () => {
    const { supabase } = makeSupabase({
      time_clock_entries: { data: { id: 'e1', status: 'open', clock_out: '2026-01-01T00:00:00Z' }, error: null },
    })
    await TimeClockService.clockOut('e1', PROFILE_ID)
    const chain = supabase.from.mock.results[0].value
    expect(chain.eq).toHaveBeenCalledWith('id', 'e1')
    expect(chain.eq).toHaveBeenCalledWith('profile_id', PROFILE_ID)
    expect(chain.is).toHaveBeenCalledWith('clock_out', null)
  })

  it('throws NOT_FOUND when there is no matching open entry', async () => {
    makeSupabase({ time_clock_entries: { data: null, error: null } })
    await expect(TimeClockService.clockOut('missing', PROFILE_ID)).rejects.toThrow(/no open entry/i)
  })
})

describe('TimeClockService.submitRange', () => {
  const range = { from: '2026-01-05T00:00:00Z', to: '2026-01-11T23:59:59Z' }

  it('refuses to submit while any entry in range is still open', async () => {
    makeSupabase({
      time_clock_entries: { data: null, error: null, count: 1 },
    })
    await expect(TimeClockService.submitRange(ORG_ID, PROFILE_ID, range)).rejects.toThrow(/clock out/i)
  })

  it('submits closed, not-yet-submitted entries when nothing is open', async () => {
    let call = 0
    const supabase = {
      from: vi.fn(() => {
        call++
        // First from() call: the open-count guard (head:true count query).
        if (call === 1) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    lte: vi.fn(() => ({
                      is: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
                    })),
                  })),
                })),
              })),
            })),
          }
        }
        // Second from() call: the actual submit update.
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    lte: vi.fn(() => ({
                      select: vi.fn().mockResolvedValue({ data: [{ id: 'e1' }, { id: 'e2' }], error: null }),
                    })),
                  })),
                })),
              })),
            })),
          })),
        }
      }),
    }
    mockCreateClient.mockResolvedValue(supabase)

    const result = await TimeClockService.submitRange(ORG_ID, PROFILE_ID, range)
    expect(result).toEqual({ submitted: 2 })
  })
})

describe('TimeClockService.review', () => {
  it('returns { updated: 0 } without a query when entryIds is empty', async () => {
    const { supabase } = makeSupabase({})
    const result = await TimeClockService.review(ORG_ID, [], 'reviewer-1', 'approved')
    expect(result).toEqual({ updated: 0 })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('only ever moves rows currently in submitted status, scoped to the org', async () => {
    const { supabase } = makeSupabase({
      time_clock_entries: { data: [{ id: 'e1' }, { id: 'e2' }], error: null },
    })
    const result = await TimeClockService.review(ORG_ID, ['e1', 'e2'], 'reviewer-1', 'approved', 'looks right')
    expect(result).toEqual({ updated: 2 })
    const chain = supabase.from.mock.results[0].value
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', reviewed_by: 'reviewer-1', review_notes: 'looks right' })
    )
    expect(chain.eq).toHaveBeenCalledWith('organization_id', ORG_ID)
    expect(chain.eq).toHaveBeenCalledWith('status', 'submitted')
    expect(chain.in).toHaveBeenCalledWith('id', ['e1', 'e2'])
  })
})
