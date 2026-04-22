import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { EmailService } from '@/lib/services/email/email-service'

/**
 * POST /api/contacts/[id]/email
 *
 * Send an ad-hoc email to a contact. Pre-resolves the contact's email
 * address so clients can just hand us the contact id, validates that
 * the contact belongs to the caller's org, and threads the send onto
 * the contact's activity timeline via the email_sends.related_entity_*
 * columns + an activity_log entry.
 */

const bodySchema = z.object({
  subject: z.string().min(1).max(300),
  // HTML body. Callers can optionally send `text` for plain-text
  // recipients; we derive one when missing so the send still works
  // with stricter mail clients.
  html: z.string().min(1).max(200_000),
  text: z.string().max(200_000).optional(),
  cc: z.array(z.string().email()).max(10).optional(),
  bcc: z.array(z.string().email()).max(10).optional(),
  replyTo: z.string().email().optional(),
})

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const POST = createApiHandlerWithParams(
  { bodySchema },
  async (_request, context, params, body) => {
    const { data: contact, error: contactError } = await context.supabase
      .from('customers')
      .select('id, name, first_name, last_name, email, organization_id')
      .eq('id', params.id)
      .single()

    if (contactError || !contact) {
      throw new SecureError('NOT_FOUND', 'Contact not found')
    }

    if (contact.organization_id !== context.profile.organization_id) {
      throw new SecureError('FORBIDDEN', 'Contact belongs to a different organization')
    }

    if (!contact.email) {
      throw new SecureError(
        'VALIDATION_ERROR',
        'This contact has no email address on file.',
        'email',
      )
    }

    const text = body.text || htmlToPlainText(body.html)

    const result = await EmailService.send(
      context.profile.organization_id,
      {
        to: contact.email,
        cc: body.cc,
        bcc: body.bcc,
        replyTo: body.replyTo,
        subject: body.subject,
        html: body.html,
        text,
        tags: ['contact-compose'],
        relatedEntity: { type: 'customer', id: contact.id },
      },
      { sentBy: context.user.id },
    )

    // Thread the email into the contact's activity timeline so it shows
    // up alongside calls, SMS, and other interactions.
    const contactName =
      [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
      contact.name ||
      contact.email
    await context.supabase.from('activity_log').insert({
      organization_id: context.profile.organization_id,
      user_id: context.user.id,
      action: 'email_sent',
      entity_type: 'customer',
      entity_id: contact.id,
      entity_name: contactName,
      description: `Sent email: ${body.subject}`,
      new_values: {
        subject: body.subject,
        to: contact.email,
        audit_id: result.auditId,
      },
    })

    return NextResponse.json({
      ok: true,
      auditId: result.auditId,
    })
  },
)
