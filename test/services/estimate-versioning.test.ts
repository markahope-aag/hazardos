import { describe, it, expect, vi } from 'vitest'
import {
  createEstimateRevision,
  getEstimateVersionInfo,
  getEstimateChain,
  setActiveEstimateVersion,
} from '@/lib/services/estimate-versioning'

const PARENT_ID = 'parent-est-id'
const ORG_ID = 'org-1'

const parentEstimate = {
  id: PARENT_ID,
  organization_id: ORG_ID,
  site_survey_id: 'survey-1',
  customer_id: 'cust-1',
  estimate_number: 'EST-123-512026',
  status: 'sent',
  parent_estimate_id: null,
  estimate_root_id: PARENT_ID,
  version: 1,
  project_name: 'Asbestos Removal',
  project_description: null,
  scope_of_work: null,
  estimated_duration_days: 5,
  estimated_start_date: '2026-05-15',
  estimated_end_date: '2026-05-20',
  valid_until: '2026-06-15',
  subtotal: 1000,
  markup_percent: 20,
  markup_amount: 200,
  discount_percent: 0,
  discount_amount: 0,
  tax_percent: 0,
  tax_amount: 0,
  total: 1200,
  internal_notes: null,
  created_at: '2026-05-01T00:00:00Z',
  created_by: 'user-1',
}

// Line items are no longer copied in TypeScript, so no fixture for them here.
// The copy is asserted against a real database in
// tests/integration/estimate-revision-txn.test.ts.

/**
 * Builds a mock client for the revision path. The copy itself now happens inside
 * the create_estimate_revision RPC, so what is left to test here is the part the
 * service still owns: resolving a non-colliding estimate number, and passing the
 * right arguments through.
 *
 * Atomicity is deliberately NOT tested here — a mock has no transaction to roll
 * back, so any assertion about it would pass without meaning. That lives in
 * tests/integration/estimate-revision-txn.test.ts against a real Postgres.
 */
function mockClient(options: {
  parent?: Record<string, unknown> | null
  takenNumbers?: string[]
  siteAddress?: string | null
  rpcResult?: { data: unknown; error: { code?: string; message: string } | null }
}) {
  const {
    parent = parentEstimate,
    takenNumbers = [],
    siteAddress = '123 Main St',
    rpcResult = { data: 'new-est-id', error: null },
  } = options

  const rpc = vi.fn().mockResolvedValue(rpcResult)

  const supabase = {
    rpc,
    from: vi.fn((table: string) => {
      if (table === 'estimates') {
        return {
          select: vi.fn((cols: string) => {
            if (cols.includes('estimate_number')) {
              return {
                eq: vi.fn(() => ({
                  like: vi.fn().mockResolvedValue({
                    data: takenNumbers.map((n) => ({ estimate_number: n })),
                    error: null,
                  }),
                })),
              }
            }
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: parent,
                    error: parent ? null : { message: 'no rows' },
                  }),
                })),
              })),
            }
          }),
        }
      }
      if (table === 'site_surveys') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: siteAddress === null ? null : { site_address: siteAddress },
                error: null,
              }),
            })),
          })),
        }
      }
      return {}
    }),
  } as unknown as import('@supabase/supabase-js').SupabaseClient

  return { supabase, rpc }
}

describe('createEstimateRevision', () => {
  it('delegates the copy to the transactional RPC with the resolved arguments', async () => {
    const { supabase, rpc } = mockClient({})

    const result = await createEstimateRevision(supabase, ORG_ID, 'user-2', PARENT_ID, {
      revisionNotes: 'customer asked to drop floor tile scope',
    })

    expect(result.id).toBe('new-est-id')
    expect(rpc).toHaveBeenCalledTimes(1)

    const [fn, args] = rpc.mock.calls[0]
    expect(fn).toBe('create_estimate_revision')
    expect(args).toMatchObject({
      p_parent_estimate_id: PARENT_ID,
      p_organization_id: ORG_ID,
      p_created_by: 'user-2',
      p_revision_notes: 'customer asked to drop floor tile scope',
    })
    expect(args.p_estimate_number).toMatch(/^EST-/)
  })

  it('picks a number that does not collide with existing ones in the chain', async () => {
    // The whole reason numbering stayed in the service: it needs the survey
    // address and a scan of what the org has already used.
    const { supabase, rpc } = mockClient({
      siteAddress: '123 Main St',
      takenNumbers: ['EST-123MAINST-05152026', 'EST-123MAINST-05152026-r2'],
    })

    await createEstimateRevision(supabase, ORG_ID, 'u', PARENT_ID, {})

    const chosen = rpc.mock.calls[0][1].p_estimate_number as string
    expect(['EST-123MAINST-05152026', 'EST-123MAINST-05152026-r2']).not.toContain(chosen)
    expect(chosen).toMatch(/^EST-/)
  })

  it('defaults revision notes to null when none are given', async () => {
    const { supabase, rpc } = mockClient({})
    await createEstimateRevision(supabase, ORG_ID, 'u', PARENT_ID, {})
    expect(rpc.mock.calls[0][1].p_revision_notes).toBeNull()
  })

  it('throws NOT_FOUND when the parent estimate is missing', async () => {
    const { supabase, rpc } = mockClient({ parent: null })
    await expect(
      createEstimateRevision(supabase, ORG_ID, 'u', PARENT_ID, {}),
    ).rejects.toThrow(/not found/i)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('maps the RPC no_data_found guard to NOT_FOUND', async () => {
    // The parent can disappear between the read above and the locking read
    // inside the function; that surfaces as P0002 and must not leak as a raw
    // Postgres error.
    const { supabase } = mockClient({
      rpcResult: { data: null, error: { code: 'P0002', message: 'Parent estimate ... not found' } },
    })
    await expect(
      createEstimateRevision(supabase, ORG_ID, 'u', PARENT_ID, {}),
    ).rejects.toThrow(/not found/i)
  })

  it('rethrows any other RPC failure', async () => {
    const { supabase } = mockClient({
      rpcResult: { data: null, error: { code: '23505', message: 'duplicate key value' } },
    })
    await expect(
      createEstimateRevision(supabase, ORG_ID, 'u', PARENT_ID, {}),
    ).rejects.toThrow(/duplicate key/i)
  })
})

describe('getEstimateVersionInfo', () => {
  it('returns { version, total, root_id }', async () => {
    let call = 0
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => {
          call++
          if (call === 1) {
            return {
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'e2', version: 2, estimate_root_id: 'root-A' },
                  error: null,
                }),
              })),
            }
          }
          return {
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [{ version: 4 }], error: null }),
              })),
            })),
          }
        }),
      })),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    const info = await getEstimateVersionInfo(supabase, 'e2')
    expect(info).toEqual({ version: 2, total: 4, root_id: 'root-A' })
  })
})

describe('getEstimateChain', () => {
  it('orders versions ascending and includes total/status fields', async () => {
    let call = 0
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => {
          call++
          if (call === 1) {
            return {
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { estimate_root_id: 'root-Z' },
                  error: null,
                }),
              })),
            }
          }
          return {
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 'a', version: 1, status: 'sent', created_at: '2026-01-01', total: 100, estimate_number: 'EST-1', revision_notes: null, created_by: null },
                  { id: 'b', version: 2, status: 'draft', created_at: '2026-02-01', total: 150, estimate_number: 'EST-1-r2', revision_notes: 'reduced scope', created_by: null },
                ],
                error: null,
              }),
            })),
          }
        }),
      })),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    const chain = await getEstimateChain(supabase, 'b')
    expect(chain).toHaveLength(2)
    expect(chain[0].version).toBe(1)
    expect(chain[1].revision_notes).toBe('reduced scope')
  })
})

describe('setActiveEstimateVersion', () => {
  it('calls the RPC with the estimate and organization ids', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    const supabase = { rpc } as unknown as import('@supabase/supabase-js').SupabaseClient

    await setActiveEstimateVersion(supabase, ORG_ID, 'e2')

    expect(rpc).toHaveBeenCalledWith('set_active_estimate_version', {
      p_estimate_id: 'e2',
      p_organization_id: ORG_ID,
    })
  })

  it('maps the RPC no_data_found guard to NOT_FOUND', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'P0002', message: 'Estimate ... not found' },
    })
    const supabase = { rpc } as unknown as import('@supabase/supabase-js').SupabaseClient

    await expect(setActiveEstimateVersion(supabase, ORG_ID, 'missing')).rejects.toThrow(/not found/i)
  })

  it('rethrows any other RPC failure', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value' },
    })
    const supabase = { rpc } as unknown as import('@supabase/supabase-js').SupabaseClient

    await expect(setActiveEstimateVersion(supabase, ORG_ID, 'e2')).rejects.toThrow(/duplicate key/i)
  })
})
