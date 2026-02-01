import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/estimates/[id]/approve
 * Approve an estimate
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Check if user has permission to approve
    const canApprove = ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'].includes(profile.role)
    if (!canApprove) {
      throw new SecureError('FORBIDDEN')
    }

    // Get the estimate
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (estimateError || !estimate) {
      throw new SecureError('NOT_FOUND', 'Estimate not found')
    }

    // Check if estimate is in pending_approval status
    if (estimate.status !== 'pending_approval' && estimate.status !== 'draft') {
      throw new SecureError('VALIDATION_ERROR', 'Estimate cannot be approved in its current status')
    }

    // Parse request body for optional notes
    const body = await request.json().catch(() => ({}))

    // Update estimate to approved
    const { data: updated, error: updateError } = await supabase
      .from('estimates')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        approval_notes: body.notes || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ estimate: updated })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
