import { NextResponse } from 'next/server'
import { calculateEstimateFromSurvey } from '@/lib/services/estimate-calculator'
import { FollowUpsService } from '@/lib/services/follow-ups-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { estimateListQuerySchema, createEstimateFromSurveySchema } from '@/lib/validations/estimates'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { buildEntityNumberBase, withUniqueSuffix } from '@/lib/utils/entity-number'

/**
 * GET /api/estimates
 * List all estimates for the current organization
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: estimateListQuerySchema,
  },
  async (_request, context, _body, query) => {
    const limit = query.limit ?? 50
    const offset = query.offset ?? 0

    // Build query
    let dbQuery = context.supabase
      .from('estimates')
      .select(`
        *,
        site_survey:site_surveys(id, job_name, site_address, site_city, site_state, site_zip, hazard_type, status),
        customer:customers(id, company_name, name, first_name, last_name, email, phone),
        created_by_user:profiles!created_by(id, first_name, last_name, email),
        jobs:jobs!estimate_id(id, job_number, status),
        proposals(id, sent_at, status)
      `, { count: 'exact' })
      .eq('organization_id', context.profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }
    if (query.survey_id) {
      dbQuery = dbQuery.eq('site_survey_id', query.survey_id)
    }
    if (query.customer_id) {
      dbQuery = dbQuery.eq('customer_id', query.customer_id)
    }

    const { data, error, count } = await dbQuery

    if (error) {
      throw error
    }

    // Fetch most recent activity per estimate in one round-trip. We grab all
    // activity_log rows for the visible estimates and take the first per id;
    // the query is ordered DESC so the first hit is the most recent.
    const estimateIds = (data || []).map(e => e.id)
    const lastActivityById = new Map<string, string>()
    if (estimateIds.length > 0) {
      const { data: activityRows } = await context.supabase
        .from('activity_log')
        .select('entity_id, created_at')
        .eq('entity_type', 'estimate')
        .in('entity_id', estimateIds)
        .order('created_at', { ascending: false })

      for (const row of activityRows || []) {
        if (!lastActivityById.has(row.entity_id)) {
          lastActivityById.set(row.entity_id, row.created_at)
        }
      }
    }

    // Batch-load the next pending follow-up for each estimate.
    const nextFollowUpById = await FollowUpsService.getNextPendingForEntities(
      'estimate',
      estimateIds
    )

    // Transform relations
    const estimates = (data || []).map(estimate => {
      const loggedActivity = lastActivityById.get(estimate.id) ?? null
      const updatedAt = estimate.updated_at ?? null
      const lastActivityAt =
        loggedActivity && updatedAt
          ? loggedActivity > updatedAt ? loggedActivity : updatedAt
          : loggedActivity ?? updatedAt

      return {
        ...estimate,
        site_survey: Array.isArray(estimate.site_survey) ? estimate.site_survey[0] : estimate.site_survey,
        customer: Array.isArray(estimate.customer) ? estimate.customer[0] : estimate.customer,
        created_by_user: Array.isArray(estimate.created_by_user) ? estimate.created_by_user[0] : estimate.created_by_user,
        jobs: Array.isArray(estimate.jobs) ? estimate.jobs : [],
        proposals: Array.isArray(estimate.proposals) ? estimate.proposals : [],
        last_activity_at: lastActivityAt,
        next_follow_up: nextFollowUpById.get(estimate.id) ?? null,
      }
    })

    return NextResponse.json({
      estimates,
      total: count || 0,
      limit,
      offset,
    })
  }
)

/**
 * POST /api/estimates
 * Create a new estimate from a site survey
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createEstimateFromSurveySchema,
  },
  async (_request, context, body) => {
    // Get the site survey (full record needed for estimate calculation)
    const { data: survey, error: surveyError } = await context.supabase
      .from('site_surveys')
      .select('*')
      .eq('id', body.site_survey_id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (surveyError || !survey) {
      throw new SecureError('NOT_FOUND', 'Site survey not found')
    }

    // Calculate estimate from survey
    const calculation = await calculateEstimateFromSurvey(
      survey,
      context.profile.organization_id,
      context.supabase,
      {
        customMarkup: body.markup_percent,
      }
    )

    // Estimate number follows the shared EST-<street>-<mmddyyyy> convention.
    // The date comes from the caller's estimated_start_date when provided,
    // else the survey's own scheduled date — both reflect "when the work
    // is planned to happen", which is what the label is trying to convey.
    const estimateDate = body.estimated_start_date || survey.scheduled_date || null
    const estimateBase = buildEntityNumberBase('EST', survey.site_address, estimateDate)
    const { data: existingNumbers } = await context.supabase
      .from('estimates')
      .select('estimate_number')
      .eq('organization_id', context.profile.organization_id)
      .like('estimate_number', `${estimateBase}%`)
    const taken = new Set(
      (existingNumbers || []).map((r) => r.estimate_number as string),
    )
    const estimateNumber = withUniqueSuffix(estimateBase, taken)

    // Create the estimate
    const { data: estimate, error: createError } = await context.supabase
      .from('estimates')
      .insert({
        organization_id: context.profile.organization_id,
        site_survey_id: body.site_survey_id,
        customer_id: body.customer_id || survey.customer_id,
        estimate_number: estimateNumber,
        status: 'draft',
        project_name: body.project_name || survey.job_name,
        project_description: body.project_description,
        scope_of_work: body.scope_of_work,
        estimated_duration_days: body.estimated_duration_days,
        estimated_start_date: body.estimated_start_date,
        estimated_end_date: body.estimated_end_date,
        valid_until: body.valid_until,
        subtotal: calculation.subtotal,
        markup_percent: calculation.markup_percent,
        markup_amount: calculation.markup_amount,
        discount_percent: calculation.discount_percent,
        discount_amount: calculation.discount_amount,
        tax_percent: calculation.tax_percent,
        tax_amount: calculation.tax_amount,
        total: calculation.total,
        internal_notes: body.internal_notes,
        created_by: context.user.id,
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    // Create line items
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

    await context.supabase
      .from('estimate_line_items')
      .insert(lineItemsToInsert)

    // Update survey status to 'estimated'
    await context.supabase
      .from('site_surveys')
      .update({ status: 'estimated' })
      .eq('id', body.site_survey_id)

    return NextResponse.json({ estimate }, { status: 201 })
  }
)
