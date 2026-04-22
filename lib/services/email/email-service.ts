/**
 * Multi-tenant email service.
 *
 * Every outbound email — invoice, reminder, approval notification,
 * ad-hoc agent compose — flows through this one call. Responsibilities:
 *
 *   1. Resolve the correct from-address + reply-to for the tenant
 *      (their verified domain if they have one, otherwise the platform
 *      shared subdomain with a friendly-from name so the inbox still
 *      shows the tenant's name).
 *   2. Pre-record the send in `email_sends` so audit exists even if the
 *      provider call throws.
 *   3. Hand off to the provider, update the audit row with the provider
 *      message id, and return.
 *   4. On provider error, mark the row `failed` with the error message —
 *      important for platform admins investigating "why didn't my
 *      customer get their invoice."
 *
 * Callers receive an `auditId` they can use to surface send status in
 * the UI (e.g. the compose dialog shows "Delivered" once the webhook
 * lands).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { ResendProvider } from './resend-provider'
import type {
  EmailProvider,
  ResolvedSender,
  SendEmailInput,
  SendEmailResult,
} from './types'

// Shared platform subdomain for tenants who haven't verified their own.
// Domain must be added + verified in the Resend dashboard; do not rely
// on the Resend sandbox (resend.dev) in production — deliverability
// there is intentionally poor.
const PLATFORM_SEND_DOMAIN = process.env.RESEND_PLATFORM_DOMAIN || 'send.hazardos.app'
const PLATFORM_DEFAULT_LOCAL = 'no-reply'

function getProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new ResendProvider(apiKey)
}

/**
 * Slugify the org name for use as an email local-part. "Acme Remediation
 * Services, LLC" → "acme-remediation-services". Keeps the shared-domain
 * address readable and scoped to the tenant.
 */
function slugForOrg(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'tenant'
  )
}

/**
 * Returns the effective sender configuration for an organization.
 * Exposed for UI preview ("This is what your customer will see").
 */
export async function resolveSender(organizationId: string): Promise<ResolvedSender> {
  const supabase = createAdminClient()
  const { data: org, error } = await supabase
    .from('organizations')
    .select('name, email, email_from_name, email_reply_to, email_domain, email_domain_status')
    .eq('id', organizationId)
    .single()

  if (error || !org) {
    throw new Error(`resolveSender: organization ${organizationId} not found`)
  }

  const fromName = org.email_from_name || org.name
  const replyTo = org.email_reply_to || org.email || null

  if (org.email_domain && org.email_domain_status === 'verified') {
    return {
      fromEmail: `${PLATFORM_DEFAULT_LOCAL}@${org.email_domain}`,
      fromName,
      replyTo,
      usingVerifiedDomain: true,
    }
  }

  return {
    fromEmail: `${slugForOrg(org.name)}@${PLATFORM_SEND_DOMAIN}`,
    fromName,
    replyTo,
    usingVerifiedDomain: false,
  }
}

export class EmailService {
  /**
   * Send a transactional email on behalf of `organizationId`. Always
   * writes an audit row, whether the provider succeeds or fails.
   */
  static async send(
    organizationId: string,
    input: SendEmailInput,
    options: { sentBy?: string | null } = {},
  ): Promise<SendEmailResult> {
    const supabase = createAdminClient()
    const sender = await resolveSender(organizationId)
    const provider = getProvider()

    const toList = Array.isArray(input.to) ? input.to : [input.to]
    const primaryTo = toList[0]
    const replyTo = input.replyTo ?? sender.replyTo ?? undefined

    // 1) Pre-record so we have an audit row even if the send throws.
    const { data: audit, error: auditError } = await supabase
      .from('email_sends')
      .insert({
        organization_id: organizationId,
        sent_by: options.sentBy ?? null,
        to_email: primaryTo,
        cc: input.cc ?? null,
        bcc: input.bcc ?? null,
        reply_to: replyTo ?? null,
        from_email: sender.fromEmail,
        from_name: sender.fromName,
        subject: input.subject,
        status: 'queued',
        tags: input.tags ?? null,
        related_entity_type: input.relatedEntity?.type ?? null,
        related_entity_id: input.relatedEntity?.id ?? null,
      })
      .select('id')
      .single()

    if (auditError || !audit) {
      throw new Error(`EmailService: failed to record send — ${auditError?.message ?? 'no row'}`)
    }

    // 2) Hand off to the provider.
    try {
      const { providerMessageId } = await provider.send({
        from: { email: sender.fromEmail, name: sender.fromName },
        to: toList,
        cc: input.cc,
        bcc: input.bcc,
        replyTo,
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments: input.attachments,
        tags: input.tags,
      })

      await supabase
        .from('email_sends')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: providerMessageId,
        })
        .eq('id', audit.id)

      return { auditId: audit.id, providerMessageId }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await supabase
        .from('email_sends')
        .update({ status: 'failed', error_message: message })
        .eq('id', audit.id)
      throw err
    }
  }

  /**
   * Provision a verified-domain setup for a tenant. Creates the domain
   * at the provider, stores the DNS records so we can show them in the
   * UI, and marks the org as `pending`. The tenant adds the records to
   * their DNS, then the verification polling kicks status to 'verified'.
   */
  static async startDomainVerification(organizationId: string, domain: string) {
    const supabase = createAdminClient()
    const provider = getProvider()

    const normalized = domain.trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9-]{0,62}(\.[a-z0-9][a-z0-9-]{0,62})+$/.test(normalized)) {
      throw new Error('Invalid domain. Use the format acmeremediation.com.')
    }

    const { providerId, records } = await provider.createDomain(normalized)

    const { error } = await supabase
      .from('organizations')
      .update({
        email_domain: normalized,
        email_domain_status: 'pending',
        email_domain_provider_id: providerId,
        email_domain_records: records,
        email_domain_verified_at: null,
      })
      .eq('id', organizationId)

    if (error) throw error

    return { domain: normalized, providerId, records }
  }

  /**
   * Poll the provider for the current verification status and update
   * the org row. Called from the UI on an interval while the user is
   * adding DNS records.
   */
  static async refreshDomainStatus(organizationId: string) {
    const supabase = createAdminClient()
    const provider = getProvider()

    const { data: org } = await supabase
      .from('organizations')
      .select('email_domain, email_domain_provider_id, email_domain_status')
      .eq('id', organizationId)
      .single()

    if (!org?.email_domain_provider_id) {
      return { status: null as 'pending' | 'verified' | 'failed' | null, records: [] }
    }

    const { status, records } = await provider.getDomain(org.email_domain_provider_id)

    const { error } = await supabase
      .from('organizations')
      .update({
        email_domain_status: status,
        email_domain_records: records,
        email_domain_verified_at: status === 'verified' ? new Date().toISOString() : null,
      })
      .eq('id', organizationId)

    if (error) throw error

    return { status, records, domain: org.email_domain }
  }

  /**
   * Remove the tenant's custom domain and revert them to shared-sender.
   */
  static async removeDomain(organizationId: string) {
    const supabase = createAdminClient()
    const provider = getProvider()

    const { data: org } = await supabase
      .from('organizations')
      .select('email_domain_provider_id')
      .eq('id', organizationId)
      .single()

    if (org?.email_domain_provider_id) {
      // Best-effort: if the provider call fails we still clear local
      // state so the tenant isn't stuck with a half-configured record.
      try {
        await provider.deleteDomain(org.email_domain_provider_id)
      } catch {
        // swallow — local clear below is the source of truth for us
      }
    }

    const { error } = await supabase
      .from('organizations')
      .update({
        email_domain: null,
        email_domain_status: null,
        email_domain_provider_id: null,
        email_domain_records: null,
        email_domain_verified_at: null,
      })
      .eq('id', organizationId)

    if (error) throw error
  }
}
