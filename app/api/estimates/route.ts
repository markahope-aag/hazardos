import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateEstimateFromSurvey } from '@/lib/services/estimate-calculator'
import type { CreateEstimateInput } from '@/types/estimates'

/**
 * GET /api/estimates
 * List all estimates for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const surveyId = searchParams.get('survey_id')
    const customerId = searchParams.get('customer_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('estimates')
      .select(`
        *,
        site_survey:site_surveys(id, job_name, site_address, site_city, site_state, site_zip, hazard_type, status),
        customer:customers(id, company_name, first_name, last_name, email, phone),
        created_by_user:profiles!created_by(id, first_name, last_name, email)
      `, { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (surveyId) {
      query = query.eq('site_survey_id', surveyId)
    }
    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching estimates:', error)
      return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 })
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
  } catch (error) {
    console.error('Error in GET /api/estimates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/estimates
 * Create a new estimate from a site survey
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse request body
    const body: CreateEstimateInput = await request.json()

    if (!body.site_survey_id) {
      return NextResponse.json({ error: 'site_survey_id is required' }, { status: 400 })
    }

    // Get the site survey
    const { data: survey, error: surveyError } = await supabase
      .from('site_surveys')
      .select('*')
      .eq('id', body.site_survey_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (surveyError || !survey) {
      return NextResponse.json({ error: 'Site survey not found' }, { status: 404 })
    }

    // Calculate estimate from survey
    const calculation = await calculateEstimateFromSurvey(
      survey,
      profile.organization_id,
      {
        customMarkup: body.markup_percent,
      }
    )

    // Generate estimate number using RPC
    const { data: estimateNumber, error: numberError } = await supabase
      .rpc('generate_estimate_number', { org_id: profile.organization_id })

    if (numberError) {
      console.error('Error generating estimate number:', numberError)
      return NextResponse.json({ error: 'Failed to generate estimate number' }, { status: 500 })
    }

    // Create the estimate
    const { data: estimate, error: createError } = await supabase
      .from('estimates')
      .insert({
        organization_id: profile.organization_id,
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
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating estimate:', createError)
      return NextResponse.json({ error: 'Failed to create estimate' }, { status: 500 })
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

    const { error: lineItemsError } = await supabase
      .from('estimate_line_items')
      .insert(lineItemsToInsert)

    if (lineItemsError) {
      console.error('Error creating line items:', lineItemsError)
      // Don't fail the whole request, estimate was created
    }

    // Update survey status to 'estimated'
    await supabase
      .from('site_surveys')
      .update({ status: 'estimated' })
      .eq('id', body.site_survey_id)

    return NextResponse.json({ estimate }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/estimates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
