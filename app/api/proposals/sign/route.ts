import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SignProposalInput } from '@/types/estimates'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

/**
 * POST /api/proposals/sign
 * Sign a proposal (public endpoint using access token)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Parse request body
    const body: SignProposalInput = await request.json()

    validateRequired(body.access_token, 'access_token')
    validateRequired(body.signer_name, 'signer_name')
    validateRequired(body.signer_email, 'signer_email')
    validateRequired(body.signature_data, 'signature_data')

    // Get the proposal by access token
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, status, access_token_expires_at, estimate_id')
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

    return NextResponse.json({
      success: true,
      signed_at: updated.signed_at,
    })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
