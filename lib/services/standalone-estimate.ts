import type { SupabaseClient } from '@supabase/supabase-js'
import { buildEntityNumberBase, withUniqueSuffix } from '@/lib/utils/entity-number'

export interface CreateStandaloneEstimateInput {
  organizationId: string
  userId: string
  customerId: string | null
  projectName: string
  projectDescription?: string | null
  scopeOfWork?: string | null
  estimatedDurationDays?: number | null
  estimatedStartDate?: string | null
  estimatedEndDate?: string | null
  validUntil?: string | null
  markupPercent?: number | null
  internalNotes?: string | null
}

/**
 * Create a draft estimate that isn't tied to a survey. Used when an
 * estimator needs to quote a job without doing a formal field survey
 * first — they pick a customer, give it a name, and build line items
 * by hand from the existing line-item editor.
 *
 * No calculator is invoked — the survey-derived hazard data is what
 * drives the calculator, and we don't have it. The estimate starts with
 * zero totals and zero line items; the user adds them through the
 * existing /api/estimates/[id]/line-items endpoints.
 *
 * The estimate number uses the customer's project name in place of the
 * usual street address, since there's no site address available. Falls
 * back to "X" if the project name has no leading digits.
 */
export async function createStandaloneEstimate(
  supabase: SupabaseClient,
  input: CreateStandaloneEstimateInput,
): Promise<{ id: string; estimate_number: string }> {
  const dateForLabel = input.estimatedStartDate || null
  const labelSource = input.projectName
  const base = buildEntityNumberBase('EST', labelSource, dateForLabel)
  const { data: existingNumbers } = await supabase
    .from('estimates')
    .select('estimate_number')
    .eq('organization_id', input.organizationId)
    .like('estimate_number', `${base}%`)
  const taken = new Set((existingNumbers || []).map((r) => r.estimate_number as string))
  const estimateNumber = withUniqueSuffix(base, taken)

  const markupPercent = input.markupPercent ?? 20

  const { data: estimate, error: createError } = await supabase
    .from('estimates')
    .insert({
      organization_id: input.organizationId,
      site_survey_id: null,
      customer_id: input.customerId,
      estimate_number: estimateNumber,
      status: 'draft',
      project_name: input.projectName,
      project_description: input.projectDescription ?? null,
      scope_of_work: input.scopeOfWork ?? null,
      estimated_duration_days: input.estimatedDurationDays ?? null,
      estimated_start_date: input.estimatedStartDate ?? null,
      estimated_end_date: input.estimatedEndDate ?? null,
      valid_until: input.validUntil ?? null,
      subtotal: 0,
      markup_percent: markupPercent,
      markup_amount: 0,
      discount_percent: 0,
      discount_amount: 0,
      tax_percent: 0,
      tax_amount: 0,
      total: 0,
      internal_notes: input.internalNotes ?? null,
      created_by: input.userId,
    })
    .select('id, estimate_number')
    .single()

  if (createError || !estimate) {
    throw createError || new Error('Failed to insert standalone estimate')
  }

  return { id: estimate.id as string, estimate_number: estimate.estimate_number as string }
}
