import { describe, it, expect, vi } from 'vitest'
import {
  createEstimateRevision,
  getEstimateVersionInfo,
  getEstimateChain,
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

const parentLineItems = [
  {
    id: 'li-1', estimate_id: PARENT_ID,
    item_type: 'labor', category: 'removal', description: 'Removal labor',
    quantity: 10, unit: 'hours', unit_price: 80, total_price: 800,
    source_rate_id: null, source_table: null,
    sort_order: 0, is_optional: false, is_included: true, notes: null,
  },
  {
    id: 'li-2', estimate_id: PARENT_ID,
    item_type: 'material', category: 'poly', description: 'Polyethylene sheeting',
    quantity: 5, unit: 'rolls', unit_price: 40, total_price: 200,
    source_rate_id: null, source_table: null,
    sort_order: 1, is_optional: false, is_included: true, notes: null,
  },
]

describe('createEstimateRevision', () => {
  it('copies parent fields, line items, and points back via parent_estimate_id', async () => {
    const captures = {
      estimateInsert: undefined as Record<string, unknown> | undefined,
      lineItemsInsert: undefined as Array<Record<string, unknown>> | undefined,
    }

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'estimates') {
          return {
            select: vi.fn((cols: string) => {
              if (cols.includes('estimate_number')) {
                // Loading taken numbers — return empty so withUniqueSuffix uses base
                return {
                  eq: vi.fn(() => ({
                    like: vi.fn().mockResolvedValue({ data: [], error: null }),
                  })),
                }
              }
              // Loading parent
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: parentEstimate, error: null }),
                  })),
                })),
              }
            }),
            insert: vi.fn((payload: Record<string, unknown>) => {
              captures.estimateInsert = payload
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'new-est-id' },
                    error: null,
                  }),
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
                  data: { site_address: '123 Main St' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'estimate_line_items') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({ data: parentLineItems, error: null }),
              })),
            })),
            insert: vi.fn((items: Array<Record<string, unknown>>) => {
              captures.lineItemsInsert = items
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }
        return {}
      }),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    const result = await createEstimateRevision(supabase, ORG_ID, 'user-2', PARENT_ID, {
      revisionNotes: 'customer asked to drop floor tile scope',
    })

    expect(result.id).toBe('new-est-id')
    expect(captures.estimateInsert).toBeTruthy()
    expect(captures.estimateInsert!.parent_estimate_id).toBe(PARENT_ID)
    expect(captures.estimateInsert!.status).toBe('draft')
    expect(captures.estimateInsert!.revision_notes).toBe('customer asked to drop floor tile scope')
    expect(captures.estimateInsert!.created_by).toBe('user-2')
    expect(captures.estimateInsert!.subtotal).toBe(1000)
    expect(captures.estimateInsert!.estimate_number).toMatch(/^EST-/)

    expect(captures.lineItemsInsert).toHaveLength(2)
    expect(captures.lineItemsInsert![0]).toMatchObject({
      estimate_id: 'new-est-id',
      description: 'Removal labor',
      quantity: 10,
      sort_order: 0,
    })
    expect(captures.lineItemsInsert![0]).not.toHaveProperty('id')
  })

  it('skips line item insert when parent has none', async () => {
    let lineItemInsertCalled = false
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'estimates') {
          return {
            select: vi.fn((cols: string) => {
              if (cols.includes('estimate_number')) {
                return {
                  eq: vi.fn(() => ({
                    like: vi.fn().mockResolvedValue({ data: [], error: null }),
                  })),
                }
              }
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: parentEstimate, error: null }),
                  })),
                })),
              }
            }),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'new' }, error: null }),
              })),
            })),
          }
        }
        if (table === 'site_surveys') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { site_address: '1 St' }, error: null }),
              })),
            })),
          }
        }
        if (table === 'estimate_line_items') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
            insert: vi.fn(() => {
              lineItemInsertCalled = true
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }
        return {}
      }),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    await createEstimateRevision(supabase, ORG_ID, 'u', PARENT_ID, {})
    expect(lineItemInsertCalled).toBe(false)
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
