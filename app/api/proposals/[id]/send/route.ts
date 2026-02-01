import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { sendProposalSchema } from '@/lib/validations/proposals'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * POST /api/proposals/[id]/send
 * Send a proposal to the customer via email
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: sendProposalSchema,
  },
  async (_request, context, params, body) => {
    // Get the proposal
    const { data: proposal, error: proposalError } = await context.supabase
      .from('proposals')
      .select(`
        *,
        organization:organizations(id, name, email)
      `)
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (proposalError || !proposal) {
      throw new SecureError('NOT_FOUND', 'Proposal not found')
    }

    // Check if proposal can be sent
    if (!['draft', 'sent'].includes(proposal.status)) {
      throw new SecureError('VALIDATION_ERROR', 'Proposal cannot be sent in its current status')
    }

    // Generate portal URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const portalUrl = `${appUrl}/portal/proposal/${proposal.access_token}`

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
      } catch {
        // Continue anyway - we'll update the status
      }
    }

    // Update proposal status
    const { data: updated, error: updateError } = await context.supabase
      .from('proposals')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to_email: body.recipient_email,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      proposal: updated,
      portal_url: portalUrl,
      email_sent: !!resendApiKey,
    })
  }
)
