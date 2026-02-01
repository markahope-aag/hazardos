import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/portal/proposal/[token]
 * Public endpoint to get proposal by access token
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Apply rate limiting for public endpoints
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'public')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { token } = await params
    const supabase = await createClient()

    // Get proposal by access token
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select(`
        id,
        proposal_number,
        status,
        access_token_expires_at,
        cover_letter,
        terms_and_conditions,
        payment_terms,
        exclusions,
        inclusions,
        valid_until,
        sent_at,
        signed_at,
        signer_name,
        viewed_count,
        estimate:estimates(
          id,
          estimate_number,
          project_name,
          scope_of_work,
          subtotal,
          markup_percent,
          markup_amount,
          discount_percent,
          discount_amount,
          tax_percent,
          tax_amount,
          total,
          estimated_duration_days,
          estimated_start_date,
          estimated_end_date,
          site_survey:site_surveys(
            id,
            job_name,
            site_address,
            site_city,
            site_state,
            site_zip,
            hazard_type
          ),
          line_items:estimate_line_items(
            id,
            item_type,
            category,
            description,
            quantity,
            unit,
            unit_price,
            total_price,
            is_optional,
            is_included,
            sort_order
          )
        ),
        customer:customers(
          id,
          company_name,
          first_name,
          last_name,
          email,
          phone
        ),
        organization:organizations(
          id,
          name,
          address,
          city,
          state,
          zip,
          phone,
          email,
          website
        )
      `)
      .eq('access_token', token)
      .single()

    if (error || !proposal) {
      throw new SecureError('NOT_FOUND', 'Proposal not found')
    }

    // Check if token is expired
    if (new Date(proposal.access_token_expires_at) < new Date()) {
      throw new SecureError('VALIDATION_ERROR', 'This proposal link has expired')
    }

    // Transform relations
    const transformedProposal = {
      ...proposal,
      estimate: Array.isArray(proposal.estimate) ? proposal.estimate[0] : proposal.estimate,
      customer: Array.isArray(proposal.customer) ? proposal.customer[0] : proposal.customer,
      organization: Array.isArray(proposal.organization) ? proposal.organization[0] : proposal.organization,
    }

    // Sort line items if present
    if (transformedProposal.estimate?.line_items) {
      transformedProposal.estimate.line_items.sort(
        (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
      )
    }

    // Update viewed status if not already viewed or signed
    if (proposal.status === 'sent') {
      await supabase
        .from('proposals')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
          viewed_count: (proposal.viewed_count || 0) + 1,
        })
        .eq('id', proposal.id)
    } else if (proposal.status === 'viewed') {
      // Increment view count
      await supabase
        .from('proposals')
        .update({
          viewed_count: (proposal.viewed_count || 0) + 1,
        })
        .eq('id', proposal.id)
    }

    return NextResponse.json({ proposal: transformedProposal })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
