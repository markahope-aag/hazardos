import type { SupabaseClient } from '@supabase/supabase-js'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { roundCurrency } from './estimate-pricing-rules'

export interface RecomputedTotals {
  subtotal: number
  markup_percent: number
  markup_amount: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  tax_amount: number
  total: number
}

/**
 * Recompute and persist an estimate's monetary roll-up from its current
 * line items. Without this, the stored subtotal/markup/discount/tax/
 * total fields go stale the moment a line item changes — the line
 * items endpoints update only their own row's `total_price`, so the
 * estimate's totals would diverge from reality.
 *
 * Order of operations matches what the customer sees on the proposal:
 *   subtotal     = sum(line_items.total_price WHERE is_included)
 *   + markup     = subtotal × markup_percent / 100
 *   - discount   = explicit discount_amount, OR subtotal × discount_percent / 100
 *   + tax        = (subtotal + markup - discount) × tax_percent / 100
 *   = total
 *
 * Discount mode:
 *   - If discount_amount > 0 we treat it as the canonical flat dollar
 *     value and ignore discount_percent for math purposes (still stored
 *     for display history).
 *   - Else we derive the flat amount from discount_percent.
 *
 * Returns the recomputed totals so callers can echo them back without
 * a second query.
 */
export async function recomputeEstimateTotals(
  supabase: SupabaseClient,
  estimateId: string,
): Promise<RecomputedTotals> {
  const { data: estimate, error: estimateErr } = await supabase
    .from('estimates')
    .select('id, markup_percent, discount_percent, discount_amount, tax_percent')
    .eq('id', estimateId)
    .single()

  if (estimateErr || !estimate) {
    throw new SecureError('NOT_FOUND', 'Estimate not found')
  }

  const { data: items, error: itemsErr } = await supabase
    .from('estimate_line_items')
    .select('total_price, is_included')
    .eq('estimate_id', estimateId)

  if (itemsErr) {
    throw itemsErr
  }

  const subtotal = (items || []).reduce(
    (sum, it) => sum + (it.is_included === false ? 0 : Number(it.total_price) || 0),
    0,
  )

  const markupPercent = Number(estimate.markup_percent) || 0
  const markupAmount = subtotal * (markupPercent / 100)

  // Flat-amount discount wins over percent when both are set. The edit
  // UI enforces "one or the other" but the schema allows both, so the
  // recompute is the safety net.
  const explicitDiscountAmount = Number(estimate.discount_amount) || 0
  const discountPercent = Number(estimate.discount_percent) || 0
  const discountAmount =
    explicitDiscountAmount > 0
      ? explicitDiscountAmount
      : subtotal * (discountPercent / 100)

  const taxableBase = subtotal + markupAmount - discountAmount
  const taxPercent = Number(estimate.tax_percent) || 0
  const taxAmount = taxableBase * (taxPercent / 100)

  const total = taxableBase + taxAmount

  const recomputed: RecomputedTotals = {
    subtotal: roundCurrency(subtotal),
    markup_percent: markupPercent,
    markup_amount: roundCurrency(markupAmount),
    discount_percent: discountPercent,
    discount_amount: roundCurrency(discountAmount),
    tax_percent: taxPercent,
    tax_amount: roundCurrency(taxAmount),
    total: roundCurrency(total),
  }

  const { error: updateErr } = await supabase
    .from('estimates')
    .update({
      subtotal: recomputed.subtotal,
      markup_amount: recomputed.markup_amount,
      discount_amount: recomputed.discount_amount,
      tax_amount: recomputed.tax_amount,
      total: recomputed.total,
    })
    .eq('id', estimateId)

  if (updateErr) {
    throw updateErr
  }

  return recomputed
}
