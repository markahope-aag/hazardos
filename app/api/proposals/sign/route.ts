import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPublicApiHandler } from '@/lib/utils/api-handler'
import { signProposalSchema } from '@/lib/validations/proposals'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { NotificationHelpers } from '@/lib/services/notification-service'
import { logger, formatError } from '@/lib/utils/logger'

/**
 * POST /api/proposals/sign
 * Sign a proposal (public endpoint using access token).
 *
 * Goes through sign_proposal_by_token(), a SECURITY DEFINER function. The
 * token-to-proposal lookup used to be a raw-table select permitted by an RLS
 * policy that never checked which token the caller held, so any authenticated
 * user could read another tenant's access_token and sign their contract with
 * it. See migration 20260722000001.
 *
 * The expiry and status guards live in the function too, so they hold even if
 * something calls it directly rather than coming through this route.
 */
export const POST = createPublicApiHandler(
  {
    rateLimit: 'general',
    bodySchema: signProposalSchema,
  },
  async (request, body) => {
    const supabase = await createClient()

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    const { data: result, error } = await supabase.rpc('sign_proposal_by_token', {
      p_token: body.access_token,
      p_signer_name: body.signer_name,
      p_signer_email: body.signer_email,
      p_signer_ip: ip,
      p_signature_data: body.signature_data,
    })

    if (error || !result) {
      throw new SecureError('BAD_REQUEST', 'Failed to sign proposal')
    }

    switch (result.error) {
      case 'not_found':
        throw new SecureError('NOT_FOUND', 'Invalid or expired access token')
      case 'expired':
        throw new SecureError('VALIDATION_ERROR', 'Access token has expired')
      case 'already_signed':
        throw new SecureError('VALIDATION_ERROR', 'Proposal has already been signed')
      case 'invalid_status':
        throw new SecureError('VALIDATION_ERROR', 'Proposal cannot be signed in its current status')
    }

    // Best-effort — a failed notification shouldn't fail the signing itself.
    if (result.created_by) {
      try {
        await NotificationHelpers.proposalSigned(
          result.id,
          result.proposal_number,
          result.created_by,
        )
      } catch (error) {
        logger.error(
          { error: formatError(error, 'PROPOSAL_SIGNED_NOTIFICATION_ERROR'), proposalId: result.id },
          'Failed to send proposal-signed notification',
        )
      }
    }

    return NextResponse.json({
      success: true,
      signed_at: new Date().toISOString(),
    })
  }
)
