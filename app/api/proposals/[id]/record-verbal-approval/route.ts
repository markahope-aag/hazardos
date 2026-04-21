import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { recordVerbalApprovalSchema } from '@/lib/validations/proposals'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/proposals/[id]/record-verbal-approval
 * Record a customer's verbal approval (e.g. they called in instead of
 * signing the emailed proposal). Moves the proposal to "signed" status
 * with approval_method='verbal' and captures who recorded it and why,
 * so the downstream job/invoice flow works without a separate branch
 * but the audit trail still distinguishes verbal from digital.
 */
export const POST = createApiHandlerWithParams(
  {
    allowedRoles: ROLES.TENANT_ADMIN,
    rateLimit: 'general',
    bodySchema: recordVerbalApprovalSchema,
  },
  async (_request, context, params, body) => {
    const { data: proposal, error: proposalError } = await context.supabase
      .from('proposals')
      .select('id, status, estimate_id, customer_id')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (proposalError || !proposal) {
      throw new SecureError('NOT_FOUND', 'Proposal not found')
    }

    // Same state guard as the public sign endpoint — only apply to a
    // proposal that's been sent or viewed, not drafts or already-signed.
    if (!['sent', 'viewed'].includes(proposal.status)) {
      if (proposal.status === 'signed') {
        throw new SecureError(
          'VALIDATION_ERROR',
          'Proposal has already been signed',
        )
      }
      throw new SecureError(
        'VALIDATION_ERROR',
        'Proposal must be sent before recording verbal approval',
      )
    }

    // Pull the customer email so signer_email has something sensible even
    // when the admin didn't type one. Best-effort: if the customer record
    // was deleted or has no email, fall back to the org's contact.
    let signerEmail: string | null = null
    if (proposal.customer_id) {
      const { data: customer } = await context.supabase
        .from('customers')
        .select('email')
        .eq('id', proposal.customer_id)
        .single()
      signerEmail = customer?.email ?? null
    }

    const approvedAt = body.approved_at ?? new Date().toISOString()

    const { data: updated, error: updateError } = await context.supabase
      .from('proposals')
      .update({
        status: 'signed',
        signed_at: approvedAt,
        signer_name: body.signer_name,
        signer_email: signerEmail,
        approval_method: 'verbal',
        verbal_approval_note: body.note,
        approved_by_user_id: context.user.id,
      })
      .eq('id', proposal.id)
      .select()
      .single()

    if (updateError) {
      throw new SecureError('BAD_REQUEST', 'Failed to record verbal approval')
    }

    await context.supabase
      .from('estimates')
      .update({ status: 'accepted' })
      .eq('id', proposal.estimate_id)

    return NextResponse.json({
      success: true,
      signed_at: updated.signed_at,
      approval_method: updated.approval_method,
    })
  },
)
