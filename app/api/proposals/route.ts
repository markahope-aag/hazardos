import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { proposalListQuerySchema, createProposalSchema } from '@/lib/validations/proposals'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/proposals
 * List all proposals for the current organization
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: proposalListQuerySchema,
  },
  async (_request, context, _body, query) => {
    const limit = query.limit || 50
    const offset = query.offset || 0

    // Build query
    let dbQuery = context.supabase
      .from('proposals')
      .select(`
        *,
        estimate:estimates(
          id, estimate_number, project_name, total, status,
          site_survey:site_surveys(id, job_name, site_address, site_city, site_state)
        ),
        customer:customers(id, company_name, first_name, last_name, email, phone)
      `, { count: 'exact' })
      .eq('organization_id', context.profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }
    if (query.estimate_id) {
      dbQuery = dbQuery.eq('estimate_id', query.estimate_id)
    }
    if (query.customer_id) {
      dbQuery = dbQuery.eq('customer_id', query.customer_id)
    }

    const { data, error, count } = await dbQuery

    if (error) {
      throw error
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
  }
)

/**
 * POST /api/proposals
 * Create a new proposal from an estimate
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createProposalSchema,
  },
  async (_request, context, body) => {
    // Get the estimate
    const { data: estimate, error: estimateError } = await context.supabase
      .from('estimates')
      .select('*, customer_id')
      .eq('id', body.estimate_id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (estimateError || !estimate) {
      throw new SecureError('NOT_FOUND', 'Estimate not found')
    }

    // Check if estimate is approved
    if (estimate.status !== 'approved' && estimate.status !== 'sent') {
      throw new SecureError('VALIDATION_ERROR', 'Cannot create proposal from an unapproved estimate')
    }

    // Generate proposal number using RPC
    const { data: proposalNumber } = await context.supabase
      .rpc('generate_proposal_number', { org_id: context.profile.organization_id })

    // Generate access token
    const { data: accessToken } = await context.supabase
      .rpc('generate_access_token')

    // Set expiration (30 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Set valid until date (30 days from now if not provided)
    const validUntil = body.valid_until || expiresAt.toISOString().split('T')[0]

    // Create the proposal
    const { data: proposal, error: createError } = await context.supabase
      .from('proposals')
      .insert({
        organization_id: context.profile.organization_id,
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
        created_by: context.user.id,
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    // Update estimate status to 'sent'
    await context.supabase
      .from('estimates')
      .update({ status: 'sent' })
      .eq('id', body.estimate_id)

    return NextResponse.json({ proposal }, { status: 201 })
  }
)
