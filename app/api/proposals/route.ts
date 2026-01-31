import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateProposalInput } from '@/types/estimates'

/**
 * GET /api/proposals
 * List all proposals for the current organization
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
    const estimateId = searchParams.get('estimate_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('proposals')
      .select(`
        *,
        estimate:estimates(
          id, estimate_number, project_name, total, status,
          site_survey:site_surveys(id, job_name, site_address, site_city, site_state)
        ),
        customer:customers(id, company_name, first_name, last_name, email, phone)
      `, { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (estimateId) {
      query = query.eq('estimate_id', estimateId)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching proposals:', error)
      return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 })
    }

    // Transform relations
    const proposals = (data || []).map(proposal => ({
      ...proposal,
      estimate: Array.isArray(proposal.estimate) ? proposal.estimate[0] : proposal.estimate,
      customer: Array.isArray(proposal.customer) ? proposal.customer[0] : proposal.customer,
    }))

    return NextResponse.json({
      proposals,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in GET /api/proposals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/proposals
 * Create a new proposal from an estimate
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
    const body: CreateProposalInput = await request.json()

    if (!body.estimate_id) {
      return NextResponse.json({ error: 'estimate_id is required' }, { status: 400 })
    }

    // Get the estimate
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('*, customer_id')
      .eq('id', body.estimate_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (estimateError || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // Check if estimate is approved
    if (estimate.status !== 'approved' && estimate.status !== 'sent') {
      return NextResponse.json({
        error: 'Cannot create proposal from an unapproved estimate'
      }, { status: 400 })
    }

    // Generate proposal number using RPC
    const { data: proposalNumber, error: numberError } = await supabase
      .rpc('generate_proposal_number', { org_id: profile.organization_id })

    if (numberError) {
      console.error('Error generating proposal number:', numberError)
    }

    // Generate access token
    const { data: accessToken } = await supabase
      .rpc('generate_access_token')

    // Set expiration (30 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Set valid until date (30 days from now if not provided)
    const validUntil = body.valid_until || expiresAt.toISOString().split('T')[0]

    // Create the proposal
    const { data: proposal, error: createError } = await supabase
      .from('proposals')
      .insert({
        organization_id: profile.organization_id,
        estimate_id: body.estimate_id,
        customer_id: estimate.customer_id,
        proposal_number: proposalNumber || `PRO-${Date.now()}`,
        status: 'draft',
        access_token: accessToken,
        access_token_expires_at: expiresAt.toISOString(),
        cover_letter: body.cover_letter,
        terms_and_conditions: body.terms_and_conditions,
        payment_terms: body.payment_terms,
        exclusions: body.exclusions,
        inclusions: body.inclusions,
        valid_until: validUntil,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating proposal:', createError)
      return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 })
    }

    // Update estimate status to 'sent'
    await supabase
      .from('estimates')
      .update({ status: 'sent' })
      .eq('id', body.estimate_id)

    return NextResponse.json({ proposal }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/proposals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
