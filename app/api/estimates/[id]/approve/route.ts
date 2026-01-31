import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user has permission to approve
    const canApprove = ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'].includes(profile.role)
    if (!canApprove) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Get the estimate
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (estimateError || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // Check if estimate is in pending_approval status
    if (estimate.status !== 'pending_approval' && estimate.status !== 'draft') {
      return NextResponse.json({
        error: 'Estimate cannot be approved in its current status'
      }, { status: 400 })
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
      console.error('Error approving estimate:', updateError)
      return NextResponse.json({ error: 'Failed to approve estimate' }, { status: 500 })
    }

    return NextResponse.json({ estimate: updated })
  } catch (error) {
    console.error('Error in POST /api/estimates/[id]/approve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
