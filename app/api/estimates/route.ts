import { NextResponse } from 'next/server'
import { calculateEstimateFromSurvey } from '@/lib/services/estimate-calculator'
import { createApiHandler } from '@/lib/utils/api-handler'
import { estimateListQuerySchema, createEstimateFromSurveySchema } from '@/lib/validations/estimates'
import { SecureError } from '@/lib/utils/secure-error-handler'

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
    const limit = parseInt(query.limit || '50')
    const offset = parseInt(query.offset || '0')

    // Build query
    let dbQuery = context.supabase
      .from('estimates')
      .select(`
        *,
        site_survey:site_surveys(id, job_name, site_address, site_city, site_state, site_zip, hazard_type, status),
        customer:customers(id, company_name, first_name, last_name, email, phone),
        created_by_user:profiles!created_by(id, first_name, last_name, email)
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

    // Transform relations
    const estimates = (data || []).map(estimate => ({
      ...estimate,
      site_survey: Array.isArray(estimate.site_survey) ? estimate.site_survey[0] : estimate.site_survey,
      customer: Array.isArray(estimate.customer) ? estimate.customer[0] : estimate.customer,
      created_by_user: Array.isArray(estimate.created_by_user) ? estimate.created_by_user[0] : estimate.created_by_user,
    }))

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
    // Get the site survey
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
      {
        customMarkup: body.markup_percent,
      }
    )

    // Generate estimate number using RPC
    const { data: estimateNumber, error: numberError } = await context.supabase
      .rpc('generate_estimate_number', { org_id: context.profile.organization_id })

    if (numberError) {
      throw numberError
    }

    // Create the estimate
    const { data: estimate, error: createError } = await context.supabase
      .from('estimates')
      .insert({
        organization_id: context.profile.organization_id,
        site_survey_id: body.site_survey_id,
        customer_id: body.customer_id || survey.customer_id,
        estimate_number: estimateNumber || `EST-${Date.now()}`,
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
