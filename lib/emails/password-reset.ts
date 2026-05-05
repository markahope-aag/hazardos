/**
 * HazardOS-branded password reset email.
 *
 * Returns both HTML (rendered email clients) and a plain-text fallback
 * (deliverability + accessibility). Inline styles only — no <style>
 * tags, no external CSS — Gmail's inliner is unreliable.
 */

interface PasswordResetEmailInput {
  actionLink: string
  appUrl: string
}

export function renderPasswordResetEmail({
  actionLink,
  appUrl,
}: PasswordResetEmailInput): { html: string; text: string } {
  const safeLink = escapeAttr(actionLink)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset your HazardOS password</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06); max-width:560px; width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding:28px 32px;">
              <div style="font-size:20px; font-weight:700; color:#ffffff; letter-spacing:-0.01em;">
                HazardOS
              </div>
              <div style="font-size:13px; color:#cbd5e1; margin-top:2px;">
                Environmental remediation operations
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0; font-size:22px; font-weight:600; color:#111827;">
                Reset your password
              </h1>
              <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#374151;">
                Someone — hopefully you — asked to reset the password for your HazardOS account. Click the button below to choose a new one.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
                <tr>
                  <td align="center" style="background-color:#1e3a8a; border-radius:8px;">
                    <a href="${safeLink}" style="display:inline-block; padding:14px 28px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
                      Choose a new password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px 0; font-size:13px; line-height:1.6; color:#6b7280;">
                Or paste this link into your browser:
              </p>
              <p style="margin:0 0 24px 0; font-size:13px; line-height:1.5; color:#1e3a8a; word-break:break-all;">
                <a href="${safeLink}" style="color:#1e3a8a; text-decoration:underline;">${safeLink}</a>
              </p>
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" />
              <p style="margin:0; font-size:12px; line-height:1.6; color:#6b7280;">
                The link expires in one hour. If you didn't request a password reset, you can safely ignore this email — your password won't change unless you click the link and pick a new one.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb; padding:16px 32px; border-top:1px solid #e5e7eb;">
              <p style="margin:0; font-size:11px; line-height:1.6; color:#9ca3af;">
                Sent by HazardOS · <a href="${escapeAttr(appUrl)}" style="color:#9ca3af; text-decoration:underline;">${escapeText(stripProtocol(appUrl))}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    'Reset your HazardOS password',
    '',
    'Someone — hopefully you — asked to reset the password for your HazardOS account.',
    'Open this link in your browser to choose a new password:',
    '',
    actionLink,
    '',
    "The link expires in one hour. If you didn't request a password reset, you can safely",
    "ignore this email — your password won't change unless you click the link.",
    '',
    `— HazardOS (${stripProtocol(appUrl)})`,
  ].join('\n')

  return { html, text }
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
