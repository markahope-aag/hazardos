/**
 * Shared types for the multi-tenant email layer.
 *
 * The shape is provider-agnostic so the SES swap later (if we ever
 * outgrow Resend) is a single-file change in `provider.ts` — callers
 * and the audit log stay unchanged.
 */

export interface EmailAttachment {
  filename: string
  /** Either base64-encoded content or a URL the provider should fetch */
  content?: string
  path?: string
  contentType?: string
}

export interface EmailAddress {
  email: string
  name?: string
}

export interface SendEmailInput {
  to: string | string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  html?: string
  text?: string
  attachments?: EmailAttachment[]
  /** Override the org's default reply-to (e.g. route replies to a job's owner) */
  replyTo?: string
  /** Tag buckets for analytics ('invoice', 'reminder', 'estimate'...) */
  tags?: string[]
  /**
   * Lets us thread this email into an entity's activity timeline. When
   * set, the email_sends row carries these columns so the contact or
   * job page can surface "Email sent: Invoice #1234".
   */
  relatedEntity?: {
    type: string
    id: string
  }
}

export interface SendEmailResult {
  /** email_sends.id — use this to join later when the webhook updates status */
  auditId: string
  /** Provider's message id */
  providerMessageId: string
}

export interface ResolvedSender {
  fromEmail: string
  fromName: string
  replyTo: string | null
  /**
   * Whether this org is using its own verified domain. When true, the
   * sending domain matches `email_domain` on the org. When false, we're
   * using the shared platform subdomain with a friendly-from name.
   */
  usingVerifiedDomain: boolean
}

export interface EmailProvider {
  readonly name: 'resend' | 'ses'

  send(input: {
    from: EmailAddress
    to: string[]
    cc?: string[]
    bcc?: string[]
    replyTo?: string
    subject: string
    html?: string
    text?: string
    attachments?: EmailAttachment[]
    tags?: string[]
  }): Promise<{ providerMessageId: string }>

  /** Register a custom domain for a tenant; returns DNS records to show the user */
  createDomain(domain: string): Promise<{
    providerId: string
    records: DomainDnsRecord[]
  }>

  /** Poll verification status for a previously-created domain */
  getDomain(providerId: string): Promise<{
    status: 'pending' | 'verified' | 'failed'
    records: DomainDnsRecord[]
  }>

  /** Remove a domain from the provider */
  deleteDomain(providerId: string): Promise<void>
}

export interface DomainDnsRecord {
  type: 'TXT' | 'MX' | 'CNAME'
  name: string
  value: string
  priority?: number
  ttl?: number
  /** What this record is for — shown in the UI to help the user recognize it */
  purpose?: 'spf' | 'dkim' | 'dmarc' | 'mx' | 'return-path'
}
