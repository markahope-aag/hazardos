import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { sendProposalSchema } from '@/lib/validations/proposals'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { createAdminClient } from '@/lib/supabase/admin'

const CREDENTIALS_BUCKET = 'organization-documents'
const CREDENTIALS_LINK_TTL_DAYS = 14

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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

    // Pull any credentials the estimator attached to the source estimate
    // and mint signed URLs so the recipient can open them straight from
    // the email — proof of license/insurance/bond travelling alongside
    // the bid is the whole point of the credentials feature.
    const credentialLinks: Array<{ display_name: string; file_name: string; url: string }> = []
    if (proposal.estimate_id) {
      const { data: attached, error: attachErr } = await context.supabase
        .from('estimate_attached_documents')
        .select(`
          document:organization_documents!document_id(
            id, display_name, file_name, storage_path
          )
        `)
        .eq('estimate_id', proposal.estimate_id)

      if (!attachErr && attached && attached.length > 0) {
        const admin = createAdminClient()
        const ttlSeconds = CREDENTIALS_LINK_TTL_DAYS * 24 * 60 * 60
        for (const row of attached) {
          const doc = Array.isArray(row.document) ? row.document[0] : row.document
          if (!doc) continue
          const { data: signed } = await admin.storage
            .from(CREDENTIALS_BUCKET)
            .createSignedUrl(doc.storage_path, ttlSeconds)
          if (signed?.signedUrl) {
            credentialLinks.push({
              display_name: doc.display_name,
              file_name: doc.file_name,
              url: signed.signedUrl,
            })
          }
        }
      }
    }

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

        const credentialsHtml = credentialLinks.length > 0
          ? `
            <p style="margin-top:24px;"><strong>Attached credentials:</strong></p>
            <ul style="padding-left:20px;">
              ${credentialLinks.map((d) => `
                <li style="margin-bottom:8px;">
                  <a href="${d.url}" style="color:#1f2937;text-decoration:underline;">${escapeHtml(d.display_name)}</a>
                  <div style="color:#6b7280;font-size:12px;">${escapeHtml(d.file_name)}</div>
                </li>
              `).join('')}
            </ul>
            <p style="color:#6b7280;font-size:12px;">These secure links expire in ${CREDENTIALS_LINK_TTL_DAYS} days.</p>
          `
          : ''

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
            ${credentialsHtml}
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
      credentials_attached: credentialLinks.length,
    })
  }
)
