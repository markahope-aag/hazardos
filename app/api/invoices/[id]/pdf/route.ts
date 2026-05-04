import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { InvoicesService } from '@/lib/services/invoices-service'
import {
  generateInvoicePDF,
  invoicePdfFilename,
} from '@/lib/services/invoice-pdf-generator'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/invoices/[id]/pdf
 * Render the invoice as a downloadable PDF. Used by the "Download PDF"
 * action and as the source of truth for the email attachment so the
 * file the customer downloads matches the file they received.
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, context, params) => {
    const invoice = await InvoicesService.getById(params.id)
    if (!invoice) throw new SecureError('NOT_FOUND', 'Invoice not found')

    const { data: organization } = await context.supabase
      .from('organizations')
      .select('name, email, phone, address, city, state, zip, website')
      .eq('id', context.profile.organization_id)
      .single()

    const doc = generateInvoicePDF(invoice, organization)
    const arrayBuffer = doc.output('arraybuffer')

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoicePdfFilename(invoice)}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  },
)
