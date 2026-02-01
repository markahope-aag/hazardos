import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { approveEstimateSchema } from '@/lib/validations/estimates'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * POST /api/estimates/[id]/approve
 * Approve an estimate
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: approveEstimateSchema,
    allowedRoles: ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'],
  },
  async (_request, context, params, body) => {
    // Get the estimate
    const { data: estimate, error: estimateError } = await context.supabase
      .from('estimates')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (estimateError || !estimate) {
      throw new SecureError('NOT_FOUND', 'Estimate not found')
    }

    // Check if estimate is in pending_approval status
    if (estimate.status !== 'pending_review' && estimate.status !== 'draft') {
      throw new SecureError('VALIDATION_ERROR', 'Estimate cannot be approved in its current status')
    }

    // Update estimate to approved
    const { data: updated, error: updateError } = await context.supabase
      .from('estimates')
      .update({
        status: 'approved',
        approved_by: context.user.id,
        approved_at: new Date().toISOString(),
        approval_notes: body.notes || null,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ estimate: updated })
  }
)
