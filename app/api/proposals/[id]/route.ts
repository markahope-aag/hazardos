import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/proposals/[id]
 * Get a single proposal with all relations
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED')
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'Profile not found')
    }

    // Get proposal with relations
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select(`
        *,
        estimate:estimates(
          *,
          site_survey:site_surveys(id, job_name, site_address, site_city, site_state, site_zip, hazard_type),
          line_items:estimate_line_items(*)
        ),
        customer:customers(id, company_name, first_name, last_name, email, phone, address_line1, city, state, zip),
        organization:organizations(id, name, logo_url, address, city, state, zip, phone, email, website)
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
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
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

/**
 * PATCH /api/proposals/[id]
 * Update a proposal
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED')
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'Profile not found')
    }

    // Parse request body
    const body = await request.json()

    // Check proposal exists and belongs to organization
    const { data: existing, error: existingError } = await supabase
      .from('proposals')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
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
    const { data: proposal, error: updateError } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ proposal })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

/**
 * DELETE /api/proposals/[id]
 * Delete a proposal
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED')
    }

    // Get user's organization and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'Profile not found')
    }

    // Check if user has permission to delete
    const canDelete = ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'].includes(profile.role)
    if (!canDelete) {
      throw new SecureError('FORBIDDEN')
    }

    // Delete the proposal
    const { error: deleteError } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
