import { NextResponse } from 'next/server'
import { MailchimpService } from '@/lib/services/mailchimp-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { z } from 'zod'

const mailchimpSyncContactsSchema = z.object({
  list_id: z.string().min(1, 'list_id is required'),
  customer_id: z.string().uuid().optional(),
})

/**
 * POST /api/integrations/mailchimp/sync/contacts
 * Sync contacts to Mailchimp
 */
export const POST = createApiHandler(
  {
    rateLimit: 'heavy',
    bodySchema: mailchimpSyncContactsSchema,
  },
  async (_request, context, body) => {
    if (!body.list_id) {
      throw new SecureError('VALIDATION_ERROR', 'list_id is required', 'list_id')
    }

    if (body.customer_id) {
      // Sync single customer
      const mailchimpId = await MailchimpService.syncContact(
        context.profile.organization_id,
        body.customer_id,
        body.list_id
      )
      return NextResponse.json({ success: true, mailchimp_id: mailchimpId })
    } else {
      // Sync all contacts
      const results = await MailchimpService.syncAllContacts(
        context.profile.organization_id,
        body.list_id
      )
      return NextResponse.json({ success: true, ...results })
    }
  }
)
