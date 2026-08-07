import { describe, it, expect, vi } from 'vitest'
import { recomputeEstimateTotals } from '@/lib/services/estimate-totals'

/**
 * The money roll-up on an estimate: subtotal → markup → discount → tax → total.
 *
 * This file had no coverage at all, which matters more here than almost
 * anywhere else in the codebase: every arithmetic branch below decides what a
 * customer is quoted, and a wrong answer is a wrong invoice rather than a
 * visible crash. The order of operations is asserted explicitly because
 * "discount before tax" and "markup before discount" are pricing decisions, not
 * implementation details — a refactor that reorders them silently changes what
 * every customer pays.
 */

const ESTIMATE_ID = 'est-1'

interface EstimateRow {
  markup_percent?: number | null
  discount_percent?: number | null
  discount_amount?: number | null
  tax_percent?: number | null
}

interface LineItem {
  total_price: number | string | null
  is_included?: boolean | null
}

function mockClient(options: {
  estimate?: EstimateRow | null
  items?: LineItem[]
  itemsError?: { message: string } | null
  updateError?: { message: string } | null
}) {
  const { estimate = {}, items = [], itemsError = null, updateError = null } = options

  const captured: { update?: Record<string, unknown> } = {}

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'estimates') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: estimate,
                error: estimate ? null : { message: 'no rows' },
              }),
            })),
          })),
          update: vi.fn((payload: Record<string, unknown>) => {
            captured.update = payload
            return { eq: vi.fn().mockResolvedValue({ error: updateError }) }
          }),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: itemsError ? null : items,
            error: itemsError,
          }),
        })),
      }
    }),
  } as unknown as import('@supabase/supabase-js').SupabaseClient

  return { supabase, captured }
}

describe('recomputeEstimateTotals — subtotal', () => {
  it('sums the total_price of every line item', async () => {
    const { supabase } = mockClient({
      items: [{ total_price: 800 }, { total_price: 200 }, { total_price: 12.5 }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r.subtotal).toBe(1012.5)
  })

  it('excludes items flagged is_included: false', async () => {
    const { supabase } = mockClient({
      items: [
        { total_price: 800, is_included: true },
        { total_price: 500, is_included: false },
      ],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r.subtotal).toBe(800)
  })

  it('counts items whose is_included is null or absent', async () => {
    // Only an explicit `false` excludes an item. A null here means "not
    // specified", and dropping those would quietly shrink the quote.
    const { supabase } = mockClient({
      items: [{ total_price: 100, is_included: null }, { total_price: 50 }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r.subtotal).toBe(150)
  })

  it('treats a null or unparseable price as zero rather than NaN', async () => {
    const { supabase } = mockClient({
      items: [{ total_price: 100 }, { total_price: null }, { total_price: 'abc' }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r.subtotal).toBe(100)
    expect(Number.isNaN(r.total)).toBe(false)
  })

  it('is zero for an estimate with no line items', async () => {
    const { supabase } = mockClient({ items: [] })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r).toMatchObject({ subtotal: 0, markup_amount: 0, tax_amount: 0, total: 0 })
  })
})

describe('recomputeEstimateTotals — markup, discount and tax', () => {
  it('applies markup as a percentage of subtotal', async () => {
    const { supabase } = mockClient({
      estimate: { markup_percent: 20 },
      items: [{ total_price: 1000 }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r.markup_amount).toBe(200)
    expect(r.total).toBe(1200)
  })

  it('derives the discount from discount_percent when no flat amount is set', async () => {
    const { supabase } = mockClient({
      estimate: { discount_percent: 10 },
      items: [{ total_price: 1000 }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r.discount_amount).toBe(100)
    expect(r.total).toBe(900)
  })

  it('lets a flat discount_amount win over discount_percent when both are set', async () => {
    // The edit UI enforces one or the other, but the schema allows both. If
    // this precedence flipped, an estimate carrying a stale percent would be
    // discounted twice over.
    const { supabase } = mockClient({
      estimate: { discount_percent: 50, discount_amount: 100 },
      items: [{ total_price: 1000 }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r.discount_amount).toBe(100)
    expect(r.total).toBe(900)
  })

  it('taxes the base after markup and discount, not the raw subtotal', async () => {
    // subtotal 1000 + markup 200 - discount 200 = 1000 taxable, tax 10% = 100.
    // Taxing the raw subtotal would also give 100 here, so the discount and
    // markup are deliberately unequal in the next test to tell them apart.
    const { supabase } = mockClient({
      estimate: { markup_percent: 20, discount_amount: 200, tax_percent: 10 },
      items: [{ total_price: 1000 }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r.tax_amount).toBe(100)
    expect(r.total).toBe(1100)
  })

  it('computes the documented order of operations end to end', async () => {
    // subtotal 1000, +25% markup = 1250, -100 discount = 1150 taxable,
    // +8.25% tax = 94.88 → total 1244.88.
    // Taxing before the discount would give 1252.13; taxing the subtotal alone
    // would give 1232.50. Both are wrong and both are plausible refactors.
    const { supabase } = mockClient({
      estimate: { markup_percent: 25, discount_amount: 100, tax_percent: 8.25 },
      items: [{ total_price: 600 }, { total_price: 400 }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r).toMatchObject({
      subtotal: 1000,
      markup_amount: 250,
      discount_amount: 100,
      tax_amount: 94.88,
      total: 1244.88,
    })
  })

  it('allows a discount larger than the subtotal to go negative', async () => {
    // Documents current behavior rather than endorsing it: nothing clamps at
    // zero, so an over-large flat discount produces a negative total instead of
    // being rejected. Worth knowing before someone relies on it.
    const { supabase } = mockClient({
      estimate: { discount_amount: 1500 },
      items: [{ total_price: 1000 }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r.total).toBe(-500)
  })

  it('rounds every stored money field to two decimals', async () => {
    // 333.333 × 3 = 999.999 and a 7.5% markup lands well past two decimals.
    const { supabase } = mockClient({
      estimate: { markup_percent: 7.5, tax_percent: 6.375 },
      items: [{ total_price: 333.333 }, { total_price: 333.333 }, { total_price: 333.333 }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    for (const field of ['subtotal', 'markup_amount', 'discount_amount', 'tax_amount', 'total'] as const) {
      expect(r[field]).toBe(Math.round(r[field] * 100) / 100)
    }
  })

  it('treats missing percentages as zero', async () => {
    const { supabase } = mockClient({
      estimate: { markup_percent: null, discount_percent: null, tax_percent: null },
      items: [{ total_price: 500 }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r).toMatchObject({ markup_amount: 0, discount_amount: 0, tax_amount: 0, total: 500 })
  })
})

describe('recomputeEstimateTotals — persistence and failure', () => {
  it('writes the recomputed figures back to the estimate', async () => {
    const { supabase, captured } = mockClient({
      estimate: { markup_percent: 10, tax_percent: 5 },
      items: [{ total_price: 1000 }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)

    expect(captured.update).toEqual({
      subtotal: r.subtotal,
      markup_amount: r.markup_amount,
      discount_amount: r.discount_amount,
      tax_amount: r.tax_amount,
      total: r.total,
    })
  })

  it('does not write back the percentages it was given', async () => {
    // The percents are inputs owned by the edit form. Persisting them here
    // would let a recompute overwrite an edit that is still in flight.
    const { supabase, captured } = mockClient({
      estimate: { markup_percent: 10, discount_percent: 5, tax_percent: 8 },
      items: [{ total_price: 100 }],
    })
    await recomputeEstimateTotals(supabase, ESTIMATE_ID)

    expect(captured.update).not.toHaveProperty('markup_percent')
    expect(captured.update).not.toHaveProperty('discount_percent')
    expect(captured.update).not.toHaveProperty('tax_percent')
  })

  it('echoes the percentages back to the caller', async () => {
    const { supabase } = mockClient({
      estimate: { markup_percent: 12, discount_percent: 3, tax_percent: 7 },
      items: [{ total_price: 100 }],
    })
    const r = await recomputeEstimateTotals(supabase, ESTIMATE_ID)
    expect(r).toMatchObject({ markup_percent: 12, discount_percent: 3, tax_percent: 7 })
  })

  it('throws NOT_FOUND when the estimate does not exist', async () => {
    const { supabase } = mockClient({ estimate: null })
    await expect(recomputeEstimateTotals(supabase, ESTIMATE_ID)).rejects.toThrow(/not found/i)
  })

  it('propagates a line-item read failure instead of summing to zero', async () => {
    // Swallowing this would silently zero out a real estimate.
    const { supabase, captured } = mockClient({
      itemsError: { message: 'line item read failed' },
    })
    await expect(recomputeEstimateTotals(supabase, ESTIMATE_ID)).rejects.toThrow(
      /line item read failed/,
    )
    expect(captured.update).toBeUndefined()
  })

  it('propagates a write failure so the caller cannot report stale totals as saved', async () => {
    const { supabase } = mockClient({
      items: [{ total_price: 100 }],
      updateError: { message: 'update denied' },
    })
    await expect(recomputeEstimateTotals(supabase, ESTIMATE_ID)).rejects.toThrow(/update denied/)
  })
})
