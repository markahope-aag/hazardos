import { describe, it, expect, vi } from 'vitest'
import { createStandaloneEstimate } from '@/lib/services/standalone-estimate'

describe('createStandaloneEstimate', () => {
  it('inserts a draft estimate with no site_survey_id and zero totals', async () => {
    let inserted: Record<string, unknown> | undefined

    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            like: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        insert: vi.fn((payload: Record<string, unknown>) => {
          inserted = payload
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'standalone-1', estimate_number: 'EST-X-512026' },
                error: null,
              }),
            })),
          }
        }),
      })),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    const result = await createStandaloneEstimate(supabase, {
      organizationId: 'org-1',
      userId: 'user-1',
      customerId: 'cust-1',
      projectName: 'Annual maintenance — Site B',
    })

    expect(result.id).toBe('standalone-1')
    expect(inserted).toBeTruthy()
    expect(inserted!.site_survey_id).toBeNull()
    expect(inserted!.subtotal).toBe(0)
    expect(inserted!.total).toBe(0)
    expect(inserted!.status).toBe('draft')
    expect(inserted!.created_by).toBe('user-1')
    expect(inserted!.project_name).toBe('Annual maintenance — Site B')
    expect(inserted!.markup_percent).toBe(20)
  })

  it('uses caller-supplied markup when given', async () => {
    let inserted: Record<string, unknown> | undefined
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            like: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        insert: vi.fn((payload: Record<string, unknown>) => {
          inserted = payload
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 's', estimate_number: 'n' },
                error: null,
              }),
            })),
          }
        }),
      })),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    await createStandaloneEstimate(supabase, {
      organizationId: 'o',
      userId: 'u',
      customerId: null,
      projectName: 'X',
      markupPercent: 35,
    })

    expect(inserted!.markup_percent).toBe(35)
    expect(inserted!.customer_id).toBeNull()
  })
})
