/**
 * Resend implementation of the EmailProvider interface.
 *
 * The SDK is lazy-imported so Edge runtimes that don't need email
 * functionality (e.g. `proxy.ts`) don't pull the dependency.
 */

import type {
  DomainDnsRecord,
  EmailAttachment,
  EmailProvider,
} from './types'

// Resend's domain record response varies slightly between API versions.
// Keeping this narrow matches what we actually consume, not every field.
interface ResendDomainRecord {
  record: 'TXT' | 'MX' | 'CNAME'
  name: string
  value: string
  type?: 'spf' | 'dkim' | 'dmarc' | 'mx' | 'return-path'
  priority?: number
  ttl?: string | number
}

interface ResendDomain {
  id: string
  name: string
  status: 'not_started' | 'pending' | 'verified' | 'failed' | 'temporary_failure'
  records?: ResendDomainRecord[]
}

function mapDomainRecord(r: ResendDomainRecord): DomainDnsRecord {
  return {
    type: r.record,
    name: r.name,
    value: r.value,
    priority: r.priority,
    ttl: typeof r.ttl === 'string' ? parseInt(r.ttl, 10) || undefined : r.ttl,
    purpose: r.type,
  }
}

function mapDomainStatus(s: ResendDomain['status']): 'pending' | 'verified' | 'failed' {
  if (s === 'verified') return 'verified'
  if (s === 'failed' || s === 'temporary_failure') return 'failed'
  return 'pending'
}

export class ResendProvider implements EmailProvider {
  readonly name = 'resend' as const
  private apiKey: string

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('ResendProvider: RESEND_API_KEY is not configured')
    }
    this.apiKey = apiKey
  }

  private async client() {
    const { Resend } = await import('resend')
    return new Resend(this.apiKey)
  }

  async send(input: {
    from: { email: string; name?: string }
    to: string[]
    cc?: string[]
    bcc?: string[]
    replyTo?: string
    subject: string
    html?: string
    text?: string
    attachments?: EmailAttachment[]
    tags?: string[]
  }): Promise<{ providerMessageId: string }> {
    const client = await this.client()
    const fromHeader = input.from.name
      ? `${input.from.name} <${input.from.email}>`
      : input.from.email

    if (!input.html && !input.text) {
      throw new Error('ResendProvider.send: either html or text is required')
    }

    // Resend's `CreateEmailOptions` is a discriminated union across
    // html | text | react | template. TypeScript can't narrow when
    // both html and text are optional in our input, so we pass a
    // pre-built payload typed loosely and let the SDK validate.
    const payload: Parameters<typeof client.emails.send>[0] = {
      from: fromHeader,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      replyTo: input.replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        path: a.path,
        contentType: a.contentType,
      })),
      tags: input.tags?.map((t) => ({ name: 'category', value: t })),
    } as Parameters<typeof client.emails.send>[0]

    const result = await client.emails.send(payload)

    if (result.error) {
      throw new Error(`Resend send failed: ${result.error.message}`)
    }

    const messageId = result.data?.id
    if (!messageId) {
      throw new Error('Resend send returned no id')
    }
    return { providerMessageId: messageId }
  }

  async createDomain(domain: string) {
    const client = await this.client()
    const result = await client.domains.create({ name: domain })
    if (result.error) {
      throw new Error(`Resend createDomain failed: ${result.error.message}`)
    }
    // Resend's response type includes record variants we don't consume
    // (e.g. "Receiving"). Cast through unknown since the shape we care
    // about is a narrow subset.
    const d = result.data as unknown as ResendDomain | null
    if (!d) {
      throw new Error('Resend createDomain returned no data')
    }
    return {
      providerId: d.id,
      records: (d.records || [])
        .filter((r) => r.record === 'TXT' || r.record === 'MX' || r.record === 'CNAME')
        .map(mapDomainRecord),
    }
  }

  async getDomain(providerId: string) {
    const client = await this.client()
    const result = await client.domains.get(providerId)
    if (result.error) {
      throw new Error(`Resend getDomain failed: ${result.error.message}`)
    }
    const d = result.data as unknown as ResendDomain | null
    if (!d) {
      throw new Error('Resend getDomain returned no data')
    }
    return {
      status: mapDomainStatus(d.status),
      records: (d.records || [])
        .filter((r) => r.record === 'TXT' || r.record === 'MX' || r.record === 'CNAME')
        .map(mapDomainRecord),
    }
  }

  async deleteDomain(providerId: string) {
    const client = await this.client()
    const result = await client.domains.remove(providerId)
    if (result.error) {
      throw new Error(`Resend deleteDomain failed: ${result.error.message}`)
    }
  }
}
