import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SendProposalInput } from '@/types/estimates'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/proposals/[id]/send
 * Send a proposal to the customer via email
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

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse request body
    const body: Omit<SendProposalInput, 'proposal_id'> = await request.json()

    if (!body.recipient_email) {
      return NextResponse.json({ error: 'recipient_email is required' }, { status: 400 })
    }

    // Get the proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        organization:organizations(id, name, email)
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Check if proposal can be sent
    if (!['draft', 'sent'].includes(proposal.status)) {
      return NextResponse.json({
        error: 'Proposal cannot be sent in its current status'
      }, { status: 400 })
    }

    // Generate portal URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const portalUrl = `${appUrl}/portal/proposal/${proposal.access_token}`

    // TODO: Integrate with email service (Resend)
    // For now, we'll just update the proposal status

    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      try {
        // Import Resend dynamically
        const { Resend } = await import('resend')
        const resend = new Resend(resendApiKey)

        const org = Array.isArray(proposal.organization) ? proposal.organization[0] : proposal.organization
        const fromEmail = org?.email || 'noreply@hazardos.com'
        const orgName = org?.name || 'HazardOS'

        await resend.emails.send({
          from: `${orgName} <${fromEmail}>`,
          to: body.recipient_email,
          subject: `Proposal ${proposal.proposal_number} - ${orgName}`,
          html: `
            <h1>Proposal ${proposal.proposal_number}</h1>
            <p>Dear ${body.recipient_name || 'Valued Customer'},</p>
            ${body.custom_message ? `<p>${body.custom_message}</p>` : ''}
            <p>Please review your proposal by clicking the link below:</p>
            <p><a href="${portalUrl}" style="background-color: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Proposal</a></p>
            <p>This link will expire on ${new Date(proposal.access_token_expires_at).toLocaleDateString()}.</p>
            <p>Thank you for your business!</p>
            <p>${orgName}</p>
          `,
        })
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // Continue anyway - we'll update the status
      }
    }

    // Update proposal status
    const { data: updated, error: updateError } = await supabase
      .from('proposals')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to_email: body.recipient_email,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating proposal:', updateError)
      return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 })
    }

    return NextResponse.json({
      proposal: updated,
      portal_url: portalUrl,
      email_sent: !!resendApiKey,
    })
  } catch (error) {
    console.error('Error in POST /api/proposals/[id]/send:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
