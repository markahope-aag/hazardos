import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { EmailService, resolveSender } from '@/lib/services/email/email-service'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/organizations/me/email-test
 *
 * Sends a smoke-test email through EmailService so the admin can
 * verify: the API key works, the from-address resolves correctly,
 * DKIM/SPF pass, and the webhook wiring updates the audit row.
 *
 * Defaults to the caller's own email but accepts an override so they
 * can test delivery to a specific domain (e.g. gmail, Outlook, a
 * customer's).
 */

const bodySchema = z.object({
  to: z.string().email().optional(),
})

export const POST = createApiHandler(
  { allowedRoles: ROLES.TENANT_ADMIN, bodySchema },
  async (_request, context, body) => {
    const to = body?.to || context.user.email
    if (!to) {
      throw new SecureError(
        'VALIDATION_ERROR',
        'No recipient available. Supply a `to` address or add an email to your profile.',
      )
    }

    const sender = await resolveSender(context.profile.organization_id)

    const timestamp = new Date().toISOString()
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
        <div style="background: linear-gradient(135deg, #ED6F3B, #C84A18); color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 20px;">Test email from HazardOS</h1>
          <p style="margin: 8px 0 0; opacity: 0.95; font-size: 14px;">If you're reading this, your sender configuration is working.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #6b7280;">Sent from</td><td style="padding: 8px 0; text-align: right; font-family: ui-monospace, monospace;">${sender.fromEmail}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; border-top: 1px solid #e5e7eb;">Display name</td><td style="padding: 8px 0; text-align: right; border-top: 1px solid #e5e7eb;">${escapeHtml(sender.fromName)}</td></tr>
          ${sender.replyTo ? `<tr><td style="padding: 8px 0; color: #6b7280; border-top: 1px solid #e5e7eb;">Reply-To</td><td style="padding: 8px 0; text-align: right; border-top: 1px solid #e5e7eb; font-family: ui-monospace, monospace;">${escapeHtml(sender.replyTo)}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #6b7280; border-top: 1px solid #e5e7eb;">Sender tier</td><td style="padding: 8px 0; text-align: right; border-top: 1px solid #e5e7eb;">${sender.usingVerifiedDomain ? 'Verified domain' : 'Shared platform domain'}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; border-top: 1px solid #e5e7eb;">Sent at</td><td style="padding: 8px 0; text-align: right; border-top: 1px solid #e5e7eb; font-family: ui-monospace, monospace;">${timestamp}</td></tr>
        </table>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
          Check the email headers for DKIM=pass and SPF=pass. The
          corresponding row in email_sends should flip from
          <code>sent</code> to <code>delivered</code> within seconds
          once your Resend webhook is configured.
        </p>
      </div>
    `

    const result = await EmailService.send(
      context.profile.organization_id,
      {
        to,
        subject: 'HazardOS email test',
        html,
        text: `Test email from HazardOS.\n\nSent from: ${sender.fromEmail}\nDisplay name: ${sender.fromName}\nReply-To: ${sender.replyTo ?? '(none)'}\nSender tier: ${sender.usingVerifiedDomain ? 'Verified domain' : 'Shared platform domain'}\nSent at: ${timestamp}\n\nIf you're reading this, your sender configuration is working.`,
        tags: ['email-test'],
      },
      { sentBy: context.user.id },
    )

    return NextResponse.json({
      ok: true,
      auditId: result.auditId,
      to,
      sender,
    })
  },
)

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
