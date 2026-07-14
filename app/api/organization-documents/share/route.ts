import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { EmailService } from '@/lib/services/email/email-service'
import { wrapEmailHtml } from '@/lib/services/email/template-wrapper'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { addDays } from 'date-fns'

const BUCKET = 'organization-documents'
const LINK_TTL_DAYS = 14

const shareSchema = z.object({
  document_ids: z.array(z.string().uuid()).min(1, 'Pick at least one document'),
  recipient_email: z.string().email(),
  recipient_name: z.string().max(255).optional(),
  customer_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  message: z.string().max(2000).optional(),
})

/**
 * POST /api/organization-documents/share
 *
 * Email one or more credential documents to an external recipient
 * (a prospect, a GC, an inspector). For each document we mint a
 * 14-day signed URL, render an email through the org's appearance
 * template, and write an audit row so the tenant can later prove
 * what was sent and when.
 *
 * Signed URLs are minted with the service-role client so they don't
 * inherit the tenant's session (which is moot here — the recipient
 * isn't logged in). Org isolation is enforced explicitly via the
 * `organization_id` checks before doing any storage work.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    // Emailing signed links to org credential/compliance documents to an
    // arbitrary external address is a write-like action — restrict to
    // write roles rather than defaulting to any authenticated member
    // (which included read-only viewers).
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: shareSchema,
  },
  async (_request, context, body) => {
    const orgId = context.profile.organization_id

    // Pull every doc the caller asked for and verify each belongs to
    // their org. RLS would block cross-tenant reads anyway but we
    // re-check here so we can return a clear 404 instead of an empty
    // result.
    const { data: docs, error: docsErr } = await context.supabase
      .from('organization_documents')
      .select('id, file_name, storage_path, display_name, category, expires_on, mime_type')
      .eq('organization_id', orgId)
      .in('id', body.document_ids)

    if (docsErr) throwDbError(docsErr, 'load documents')
    if (!docs || docs.length !== body.document_ids.length) {
      throw new SecureError('NOT_FOUND', 'One or more documents not found')
    }

    const { data: org, error: orgErr } = await context.supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()
    if (orgErr || !org) throw new SecureError('NOT_FOUND', 'Organization not found')

    // Mint signed URLs through the admin client. createSignedUrls is
    // service-role only — the user-session client can't sign for
    // arbitrary expiry windows.
    const admin = createAdminClient()
    const linkExpiresAt = addDays(new Date(), LINK_TTL_DAYS)
    const ttlSeconds = LINK_TTL_DAYS * 24 * 60 * 60

    const docsWithUrls: Array<{
      id: string
      display_name: string
      file_name: string
      url: string
    }> = []

    for (const doc of docs) {
      const { data: signed, error: signErr } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, ttlSeconds)
      if (signErr || !signed?.signedUrl) {
        throw new Error(`Failed to sign URL for ${doc.display_name}: ${signErr?.message ?? 'unknown'}`)
      }
      docsWithUrls.push({
        id: doc.id,
        display_name: doc.display_name,
        file_name: doc.file_name,
        url: signed.signedUrl,
      })
    }

    // Build the body of the email — list of links + the optional
    // free-form message from the sender. Wrapper supplies the
    // header bar, signature, and the rest of the chrome based on
    // the org's email-appearance settings.
    const recipientGreeting = body.recipient_name
      ? `Hi ${escapeHtml(body.recipient_name)},`
      : 'Hello,'
    const senderName = org.name

    const docsHtml = docsWithUrls
      .map(
        (d) => `
        <li style="margin-bottom:12px;">
          <a href="${d.url}" style="color:#1f2937;font-weight:600;text-decoration:underline;">${escapeHtml(d.display_name)}</a>
          <div style="color:#6b7280;font-size:12px;">${escapeHtml(d.file_name)}</div>
        </li>`,
      )
      .join('')

    const messageHtml = body.message
      ? `<p style="margin:16px 0;white-space:pre-line;">${escapeHtml(body.message)}</p>`
      : ''

    const bodyHtml = `
      <p style="margin:0 0 12px 0;">${recipientGreeting}</p>
      <p style="margin:0 0 16px 0;">${escapeHtml(senderName)} has shared the following credential${
        docsWithUrls.length === 1 ? '' : 's'
      } with you:</p>
      <ul style="padding-left:20px;margin:0 0 16px 0;">${docsHtml}</ul>
      ${messageHtml}
      <p style="margin:16px 0 0 0;color:#6b7280;font-size:13px;">These links expire in ${LINK_TTL_DAYS} days. Reach out if you need a refreshed copy.</p>
    `

    const emailHtml = await wrapEmailHtml(orgId, {
      subject: `Credentials from ${senderName}`,
      preheader: `${docsWithUrls.length} document${docsWithUrls.length === 1 ? '' : 's'} attached`,
      bodyHtml,
    })

    const { auditId } = await EmailService.send(
      orgId,
      {
        to: body.recipient_email,
        subject: `Credentials from ${senderName}`,
        html: emailHtml,
        tags: ['credentials-share'],
      },
      { sentBy: context.user.id },
    )

    // Write the audit rows — one per document. Rolls together with
    // the email_sends row via email_send_id so the share log can
    // link back to delivery status.
    const auditRows = docs.map((doc) => ({
      organization_id: orgId,
      document_id: doc.id,
      recipient_email: body.recipient_email,
      recipient_name: body.recipient_name ?? null,
      customer_id: body.customer_id ?? null,
      company_id: body.company_id ?? null,
      message: body.message ?? null,
      link_expires_at: linkExpiresAt.toISOString(),
      email_send_id: auditId ?? null,
      shared_by: context.user.id,
    }))

    const { error: shareErr } = await context.supabase
      .from('organization_document_shares')
      .insert(auditRows)
    if (shareErr) throwDbError(shareErr, 'record document share')

    return NextResponse.json({
      success: true,
      shared: docsWithUrls.length,
      link_expires_at: linkExpiresAt.toISOString(),
    })
  }
)

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
