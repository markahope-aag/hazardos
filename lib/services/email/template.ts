/**
 * Pure email template rendering — no database, no server-only imports.
 * Safe to use from both server-side senders and the client-side
 * Settings → Email preview.
 *
 * The server-side wrapper (template-wrapper.ts) reads the org's
 * appearance row from the DB and calls into here to do the actual
 * HTML assembly.
 *
 * Email-safe HTML/CSS rules: no external stylesheets, no flexbox/grid,
 * inline styles only, table-based layout for older Outlook clients.
 */

export interface EmailAppearance {
  organizationName: string
  headerColor: string
  accentColor: string
  logoUrl: string | null
  signature: string | null
}

export const DEFAULT_HEADER_COLOR = '#1f2937'
export const DEFAULT_ACCENT_COLOR = '#f97316'

export interface EmailWrapperInput {
  /** Subject is shown as the title element above the body. */
  subject?: string
  /** Pre-rendered body HTML — caller is responsible for the inner content. */
  bodyHtml: string
  /** Optional CTA — renders as a styled button below the body. */
  cta?: { url: string; label: string }
  /** Optional preheader — short preview text shown by inbox clients beside the subject line. */
  preheader?: string
}

export interface ResolveAppearanceInput {
  organizationName: string
  email_header_color: string | null
  email_accent_color: string | null
  email_logo_url: string | null
  email_signature: string | null
}

export function resolveAppearance(row: ResolveAppearanceInput): EmailAppearance {
  return {
    organizationName: row.organizationName || 'Your Company',
    headerColor: row.email_header_color || DEFAULT_HEADER_COLOR,
    accentColor: row.email_accent_color || row.email_header_color || DEFAULT_ACCENT_COLOR,
    logoUrl: row.email_logo_url,
    signature: row.email_signature,
  }
}

/**
 * Escape a string for safe interpolation into HTML text content.
 */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Render the wrapper HTML around a body. Pure — no DB calls. Used by
 * the server-side wrapper and the live settings preview alike.
 */
export function renderEmailHtml(
  appearance: EmailAppearance,
  input: EmailWrapperInput,
): string {
  const { subject, bodyHtml, cta, preheader } = input
  const { organizationName, headerColor, accentColor, logoUrl, signature } = appearance

  const headerInner = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="${esc(organizationName)}" style="max-height:48px;max-width:240px;display:block;margin:0 auto;" />`
    : `<h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;letter-spacing:-0.01em;">${esc(organizationName)}</h1>`

  const ctaHtml = cta
    ? `<div style="text-align:center;margin:32px 0;">
         <a href="${esc(cta.url)}" style="display:inline-block;padding:14px 32px;background-color:${esc(accentColor)};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">${esc(cta.label)}</a>
       </div>`
    : ''

  const preheaderHtml = preheader
    ? `<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${esc(preheader)}</div>`
    : ''

  const signatureHtml = signature
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;line-height:1.5;white-space:pre-line;">${esc(signature)}</div>`
    : `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">${esc(organizationName)}</div>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
${subject ? `<title>${esc(subject)}</title>` : ''}
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${preheaderHtml}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr>
          <td style="background-color:${esc(headerColor)};padding:24px;text-align:center;">
            ${headerInner}
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px 32px;color:#1f2937;font-size:15px;line-height:1.6;">
            ${bodyHtml}
            ${ctaHtml}
            ${signatureHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
