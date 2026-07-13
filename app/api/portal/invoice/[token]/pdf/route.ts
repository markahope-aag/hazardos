import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'
import { generateInvoicePDF, invoicePdfFilename } from '@/lib/services/invoice-pdf-generator'
import type { Invoice } from '@/types/invoices'

interface RouteParams {
  params: Promise<{ token: string }>
}

interface PortalInvoiceData {
  invoice_number: string
  status: Invoice['status']
  invoice_date: string
  due_date: string
  subtotal: number
  tax_rate: number | null
  tax_amount: number | null
  discount_amount: number | null
  total: number
  amount_paid: number | null
  balance_due: number
  payment_terms: string | null
  notes: string | null
  customer: NonNullable<Invoice['customer']>
  job: Invoice['job'] | null
  organization: {
    name: string | null
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    website: string | null
  }
  line_items: Array<{
    description: string
    quantity: number
    unit: string | null
    unit_price: number
    line_total: number
  }>
}

/**
 * GET /api/portal/invoice/[token]/pdf
 * Same PDF the customer would already receive as an email attachment
 * (generateInvoicePDF is the shared source of truth) — exposed here so the
 * public invoice view (I13) can offer a download without an account.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'public')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { token } = await params
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_invoice_for_portal', {
      p_token: token,
    })

    if (error || !data) {
      throw new SecureError('NOT_FOUND', 'Invoice not found')
    }

    const portalInvoice = data as PortalInvoiceData

    const invoice: Invoice = {
      id: '',
      organization_id: '',
      job_id: null,
      customer_id: '',
      location_id: null,
      invoice_number: portalInvoice.invoice_number,
      status: portalInvoice.status,
      invoice_date: portalInvoice.invoice_date,
      due_date: portalInvoice.due_date,
      subtotal: portalInvoice.subtotal,
      tax_rate: portalInvoice.tax_rate || 0,
      tax_amount: portalInvoice.tax_amount || 0,
      discount_amount: portalInvoice.discount_amount || 0,
      total: portalInvoice.total,
      amount_paid: portalInvoice.amount_paid || 0,
      balance_due: portalInvoice.balance_due,
      payment_terms: portalInvoice.payment_terms,
      notes: portalInvoice.notes,
      sent_at: null,
      sent_via: null,
      viewed_at: null,
      access_token: null,
      access_token_expires_at: null,
      qb_invoice_id: null,
      qb_synced_at: null,
      created_by: null,
      created_at: '',
      updated_at: '',
      customer: portalInvoice.customer,
      job: portalInvoice.job || undefined,
      line_items: portalInvoice.line_items.map((item, index) => ({
        id: String(index),
        invoice_id: '',
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        line_total: item.line_total,
        source_type: null,
        source_id: null,
        sort_order: index,
        created_at: '',
      })),
    }

    const doc = generateInvoicePDF(invoice, portalInvoice.organization)
    const arrayBuffer = doc.output('arraybuffer')

    return new NextResponse(arrayBuffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoicePdfFilename(invoice)}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
