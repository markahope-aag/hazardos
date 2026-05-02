import type { SupabaseClient } from '@supabase/supabase-js'
import type { SiteSurvey } from '@/types/database'
import { calculateEstimateFromSurvey } from '@/lib/services/estimate-calculator'
import { buildEntityNumberBase, withUniqueSuffix } from '@/lib/utils/entity-number'
import { SecureError } from '@/lib/utils/secure-error-handler'

export interface CreateDraftEstimateInput {
  siteSurveyId: string
  organizationId: string
  userId: string
  // Optional overrides — passed through from the calling API route
  customerId?: string | null
  projectName?: string | null
  projectDescription?: string | null
  scopeOfWork?: string | null
  estimatedDurationDays?: number | null
  estimatedStartDate?: string | null
  estimatedEndDate?: string | null
  validUntil?: string | null
  markupPercent?: number | null
  internalNotes?: string | null
}

export interface CreateDraftEstimateResult {
  estimate: Record<string, unknown>
  // The survey we loaded — handy for the caller so it doesn't have to refetch
  survey: SiteSurvey
}

/**
 * Create a draft estimate for a site survey using the org's pricing data.
 * Inserts the estimate + line items but does NOT mutate the survey's
 * status — that's the caller's responsibility (the manual /api/estimates
 * flow promotes the survey to 'estimated'; the auto-create-on-submit flow
 * leaves it at 'submitted').
 */
export async function createDraftEstimateFromSurvey(
  supabase: SupabaseClient,
  input: CreateDraftEstimateInput,
): Promise<CreateDraftEstimateResult> {
  const { data: survey, error: surveyError } = await supabase
    .from('site_surveys')
    .select('*')
    .eq('id', input.siteSurveyId)
    .eq('organization_id', input.organizationId)
    .single()

  if (surveyError || !survey) {
    throw new SecureError('NOT_FOUND', 'Site survey not found')
  }

  const calculation = await calculateEstimateFromSurvey(
    survey as SiteSurvey,
    input.organizationId,
    supabase,
    { customMarkup: input.markupPercent ?? undefined },
  )

  const estimateDate = input.estimatedStartDate || survey.scheduled_date || null
  const estimateBase = buildEntityNumberBase('EST', survey.site_address, estimateDate)
  const { data: existingNumbers } = await supabase
    .from('estimates')
    .select('estimate_number')
    .eq('organization_id', input.organizationId)
    .like('estimate_number', `${estimateBase}%`)
  const taken = new Set(
    (existingNumbers || []).map((r) => r.estimate_number as string),
  )
  const estimateNumber = withUniqueSuffix(estimateBase, taken)

  const { data: estimate, error: createError } = await supabase
    .from('estimates')
    .insert({
      organization_id: input.organizationId,
      site_survey_id: input.siteSurveyId,
      customer_id: input.customerId || survey.customer_id,
      estimate_number: estimateNumber,
      status: 'draft',
      project_name: input.projectName || survey.job_name,
      project_description: input.projectDescription,
      scope_of_work: input.scopeOfWork,
      estimated_duration_days: input.estimatedDurationDays,
      estimated_start_date: input.estimatedStartDate,
      estimated_end_date: input.estimatedEndDate,
      valid_until: input.validUntil,
      subtotal: calculation.subtotal,
      markup_percent: calculation.markup_percent,
      markup_amount: calculation.markup_amount,
      discount_percent: calculation.discount_percent,
      discount_amount: calculation.discount_amount,
      tax_percent: calculation.tax_percent,
      tax_amount: calculation.tax_amount,
      total: calculation.total,
      internal_notes: input.internalNotes,
      created_by: input.userId,
    })
    .select()
    .single()

  if (createError || !estimate) {
    throw createError || new Error('Failed to insert estimate')
  }

  const lineItemsToInsert = calculation.line_items.map((item, index) => ({
    estimate_id: estimate.id,
    item_type: item.item_type,
    category: item.category,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    total_price: item.total_price,
    source_rate_id: item.source_rate_id,
    source_table: item.source_table,
    sort_order: index,
    is_optional: item.is_optional,
    is_included: item.is_included,
    notes: item.notes,
  }))

  if (lineItemsToInsert.length > 0) {
    const { error: lineItemsError } = await supabase
      .from('estimate_line_items')
      .insert(lineItemsToInsert)

    if (lineItemsError) {
      throw lineItemsError
    }
  }

  return { estimate: estimate as Record<string, unknown>, survey: survey as SiteSurvey }
}
