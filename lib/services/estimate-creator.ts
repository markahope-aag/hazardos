import type { SupabaseClient } from '@supabase/supabase-js'
import type { SiteSurvey } from '@/types/database'
import { calculateEstimateFromSurvey } from '@/lib/services/estimate-calculator'
import { buildEntityNumberBase, withUniqueSuffix } from '@/lib/utils/entity-number'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { logger } from '@/lib/utils/logger'

export interface CreateEstimateFromSurveyInput {
  siteSurveyId: string
  organizationId: string
  userId: string
  // Optional overrides, passed through from the calling API route
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

export interface CreateEstimateFromSurveyResult {
  estimate: Record<string, unknown>
  // The survey we loaded, handy for the caller so it doesn't have to refetch
  survey: SiteSurvey
}

/**
 * Create an estimate for a site survey using the org's pricing data and
 * land it directly in `pending_approval`.
 *
 * `draft` is reserved for hand-rolled standalone estimates and mid-edit
 * revisions, where a human is actively typing. A survey-rooted estimate
 * is the calculator's first cut (the office manager's worksheet) and
 * its natural starting status is `pending_approval` (i.e. "ready to be
 * finished"). Letting it sit at `draft` means it's invisible to the
 * approval queue and the office manager can miss it entirely.
 *
 * The approval_requests row + admin notification are created inline.
 * If those side-effects fail we log and continue: the estimate is
 * already in the right status, and the office manager can pick it up
 * via the normal approval queue once whatever broke is fixed.
 *
 * Does NOT mutate the survey's status. That is the caller's job (the
 * manual /api/estimates flow promotes the survey to 'estimated'; the
 * auto-create-on-submit flow leaves it at 'submitted').
 */
export async function createEstimateFromSurvey(
  supabase: SupabaseClient,
  input: CreateEstimateFromSurveyInput,
): Promise<CreateEstimateFromSurveyResult> {
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

  // The estimate and its line items go in together, inside the RPC. Previously
  // these were two client-side inserts with no cleanup between them, so a
  // line-item failure left an empty estimate sitting in `pending_approval`:
  // showing a total, with nothing behind it, in the office manager's queue.
  const { data: estimateId, error: createError } = await supabase.rpc(
    'create_estimate_from_survey',
    {
      p_organization_id: input.organizationId,
      p_site_survey_id: input.siteSurveyId,
      p_created_by: input.userId,
      p_estimate_number: estimateNumber,
      p_estimate: {
        customer_id: input.customerId || survey.customer_id,
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
      },
      p_line_items: calculation.line_items,
    },
  )

  if (createError || !estimateId) {
    if (createError?.code === 'P0002') {
      throw new SecureError('NOT_FOUND', 'Site survey not found')
    }
    throw createError || new Error('Failed to insert estimate')
  }

  // Callers expect the full row back, and the RPC returns only the id.
  const { data: estimate, error: readError } = await supabase
    .from('estimates')
    .select()
    .eq('id', estimateId)
    .single()

  if (readError || !estimate) {
    throw readError || new Error('Estimate created but could not be read back')
  }

  // Enroll into the approval queue + notify admins. These are
  // side-effects: the estimate is already in pending_approval, so a
  // failure here just means the office manager has to find it through
  // the estimates list rather than via a notification. We log and
  // continue rather than failing the whole creation.
  try {
    const { error: approvalErr } = await supabase
      .from('approval_requests')
      .insert({
        organization_id: input.organizationId,
        entity_type: 'estimate',
        entity_id: estimate.id,
        amount: calculation.total || 0,
        requested_by: input.userId,
        requested_at: new Date().toISOString(),
        level1_status: 'pending',
        requires_level2: true,
        level2_status: 'pending',
        final_status: 'pending',
      })
    if (approvalErr) {
      logger.warn(
        { estimateId: estimate.id, err: approvalErr },
        'survey-rooted estimate created in pending_approval but approval_request insert failed',
      )
    }
  } catch (e) {
    logger.warn(
      { estimateId: estimate.id, err: e },
      'survey-rooted estimate created in pending_approval but approval_request insert threw',
    )
  }

  return { estimate: estimate as Record<string, unknown>, survey: survey as SiteSurvey }
}
