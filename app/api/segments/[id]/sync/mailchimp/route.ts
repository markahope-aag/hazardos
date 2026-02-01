import { NextResponse } from 'next/server'
import { SegmentationService } from '@/lib/services/segmentation-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { z } from 'zod'

const mailchimpSyncSchema = z.object({
  list_id: z.string().optional(),
})

type MailchimpSyncBody = z.infer<typeof mailchimpSyncSchema>
type Params = { id: string }

/**
 * POST /api/segments/[id]/sync/mailchimp
 * Sync segment to Mailchimp
 */
export const POST = createApiHandlerWithParams<MailchimpSyncBody, unknown, Params>(
  {
    rateLimit: 'heavy',
    bodySchema: mailchimpSyncSchema,
  },
  async (_request, context, params, body) => {
    // Get Mailchimp integration settings
    const { data: integration } = await context.supabase
      .from('organization_integrations')
      .select('settings')
      .eq('organization_id', context.profile.organization_id)
      .eq('integration_type', 'mailchimp')
      .eq('is_active', true)
      .single()

    if (!integration) {
      throw new SecureError('BAD_REQUEST', 'Mailchimp is not connected')
    }

    const settings = integration.settings as { default_list_id?: string } | null
    const listId = body?.list_id || settings?.default_list_id

    if (!listId) {
      throw new SecureError('VALIDATION_ERROR', 'list_id is required', 'list_id')
    }

    await SegmentationService.syncToMailchimp(params.id, listId)

    return NextResponse.json({ success: true })
  }
)
