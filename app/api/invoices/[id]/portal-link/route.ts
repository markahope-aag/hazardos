import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { InvoicesService } from '@/lib/services/invoices-service'
import { ROLES } from '@/lib/auth/roles'
import { SecureError } from '@/lib/utils/secure-error-handler'

const LINK_LIFETIME_DAYS = 90

/**
 * POST /api/invoices/[id]/portal-link
 * Generates (or reuses, if still valid) the customer-facing portal link for
 * an invoice — I13: there was no way to give a customer a clean, read-only
 * view of their invoice; the header menu only had internal actions.
 */
export const POST = createApiHandlerWithParams(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
  async (_request, context, params) => {
    const invoice = await InvoicesService.getById(params.id)
    if (!invoice) throw new SecureError('NOT_FOUND', 'Invoice not found')

    const stillValid =
      invoice.access_token &&
      invoice.access_token_expires_at &&
      new Date(invoice.access_token_expires_at) > new Date()

    let token = invoice.access_token

    if (!stillValid) {
      const { data: newToken, error: tokenError } = await context.supabase.rpc(
        'generate_access_token',
      )
      if (tokenError || !newToken) {
        throw new Error('Failed to generate portal link')
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + LINK_LIFETIME_DAYS)

      const { error: updateError } = await context.supabase
        .from('invoices')
        .update({ access_token: newToken, access_token_expires_at: expiresAt.toISOString() })
        .eq('id', params.id)
      if (updateError) {
        throw new Error('Failed to save portal link')
      }

      token = newToken
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    return NextResponse.json({ url: `${baseUrl}/portal/invoice/${token}` })
  },
)
