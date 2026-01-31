import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SignProposalInput } from '@/types/estimates'

/**
 * POST /api/proposals/sign
 * Sign a proposal (public endpoint using access token)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Parse request body
    const body: SignProposalInput = await request.json()

    if (!body.access_token) {
      return NextResponse.json({ error: 'access_token is required' }, { status: 400 })
    }
    if (!body.signer_name) {
      return NextResponse.json({ error: 'signer_name is required' }, { status: 400 })
    }
    if (!body.signer_email) {
      return NextResponse.json({ error: 'signer_email is required' }, { status: 400 })
    }
    if (!body.signature_data) {
      return NextResponse.json({ error: 'signature_data is required' }, { status: 400 })
    }

    // Get the proposal by access token
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, status, access_token_expires_at, estimate_id')
      .eq('access_token', body.access_token)
      .single()

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 404 })
    }

    // Check if token is expired
    if (new Date(proposal.access_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Access token has expired' }, { status: 400 })
    }

    // Check if proposal can be signed
    if (!['sent', 'viewed'].includes(proposal.status)) {
      if (proposal.status === 'signed') {
        return NextResponse.json({ error: 'Proposal has already been signed' }, { status: 400 })
      }
      return NextResponse.json({
        error: 'Proposal cannot be signed in its current status'
      }, { status: 400 })
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
      console.error('Error signing proposal:', updateError)
      return NextResponse.json({ error: 'Failed to sign proposal' }, { status: 500 })
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
    console.error('Error in POST /api/proposals/sign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
