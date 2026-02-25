import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateProposalSchema } from '@/lib/validations/proposals'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/proposals/[id]
 * Get a single proposal with all relations
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, context, params) => {
    const { data: proposal, error } = await context.supabase
      .from('proposals')
      .select(`
        *,
        estimate:estimates(
          *,
          site_survey:site_surveys(id, job_name, site_address, site_city, site_state, site_zip, hazard_type),
          line_items:estimate_line_items(*)
        ),
        customer:customers(id, company_name, name, email, phone, address_line1, city, state, zip),
        organization:organizations(id, name, logo_url, address, city, state, zip, phone, email, website)
      `)
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new SecureError('NOT_FOUND', 'Proposal not found')
      }
      throw error
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

    return NextResponse.json({ proposal: transformedProposal })
  }
)

/**
 * PATCH /api/proposals/[id]
 * Update a proposal
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateProposalSchema,
  },
  async (_request, context, params, body) => {
    // Check proposal exists and belongs to organization
    const { data: existing, error: existingError } = await context.supabase
      .from('proposals')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (existingError || !existing) {
      throw new SecureError('NOT_FOUND', 'Proposal not found')
    }

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (body.cover_letter !== undefined) updateData.cover_letter = body.cover_letter
    if (body.terms_and_conditions !== undefined) updateData.terms_and_conditions = body.terms_and_conditions
    if (body.payment_terms !== undefined) updateData.payment_terms = body.payment_terms
    if (body.exclusions !== undefined) updateData.exclusions = body.exclusions
    if (body.inclusions !== undefined) updateData.inclusions = body.inclusions
    if (body.valid_until !== undefined) updateData.valid_until = body.valid_until
    if (body.status !== undefined) updateData.status = body.status

    // Update the proposal
    const { data: proposal, error: updateError } = await context.supabase
      .from('proposals')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ proposal })
  }
)

/**
 * DELETE /api/proposals/[id]
 * Delete a proposal
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'],
  },
  async (_request, context, params) => {
    // Delete the proposal
    const { error: deleteError } = await context.supabase
      .from('proposals')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  }
)
