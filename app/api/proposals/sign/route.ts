import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPublicApiHandler } from '@/lib/utils/api-handler'
import { signProposalSchema } from '@/lib/validations/proposals'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { NotificationHelpers } from '@/lib/services/notification-service'
import { logger, formatError } from '@/lib/utils/logger'

/**
 * POST /api/proposals/sign
 * Sign a proposal (public endpoint using access token)
 */
export const POST = createPublicApiHandler(
  {
    rateLimit: 'general',
    bodySchema: signProposalSchema,
  },
  async (request, body) => {
    const supabase = await createClient()

    // Get the proposal by access token
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, status, access_token_expires_at, estimate_id, proposal_number, created_by')
      .eq('access_token', body.access_token)
      .single()

    if (proposalError || !proposal) {
      throw new SecureError('NOT_FOUND', 'Invalid or expired access token')
    }

    // Check if token is expired
    if (new Date(proposal.access_token_expires_at) < new Date()) {
      throw new SecureError('VALIDATION_ERROR', 'Access token has expired')
    }

    // Check if proposal can be signed
    if (!['sent', 'viewed'].includes(proposal.status)) {
      if (proposal.status === 'signed') {
        throw new SecureError('VALIDATION_ERROR', 'Proposal has already been signed')
      }
      throw new SecureError('VALIDATION_ERROR', 'Proposal cannot be signed in its current status')
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    // Update proposal with signature
    const { data: updated, error: updateError } = await supabase
      .from('proposals')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        signer_name: body.signer_name,
        signer_email: body.signer_email,
        signer_ip: ip,
        signature_data: body.signature_data,
      })
      .eq('id', proposal.id)
      .select()
      .single()

    if (updateError) {
      throw new SecureError('BAD_REQUEST', 'Failed to sign proposal')
    }

    // Update estimate status to 'accepted'
    await supabase
      .from('estimates')
      .update({ status: 'accepted' })
      .eq('id', proposal.estimate_id)

    // Best-effort — a failed notification shouldn't fail the signing itself.
    if (proposal.created_by) {
      try {
        await NotificationHelpers.proposalSigned(
          proposal.id,
          proposal.proposal_number,
          proposal.created_by,
        )
      } catch (error) {
        logger.error(
          { error: formatError(error, 'PROPOSAL_SIGNED_NOTIFICATION_ERROR'), proposalId: proposal.id },
          'Failed to send proposal-signed notification',
        )
      }
    }

    return NextResponse.json({
      success: true,
      signed_at: updated.signed_at,
    })
  }
)
