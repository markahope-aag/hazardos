import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InvoiceHeader } from './invoice-header'
import { InvoiceDetails } from './invoice-details'
import { InvoiceLineItems } from './invoice-line-items'
import { InvoicePayments } from './invoice-payments'

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(id, name, company_name, email, phone, address_line1, city, state, zip),
      job:jobs(id, job_number, job_address, job_city, job_state),
      line_items:invoice_line_items(*),
      payments:payments(*)
    `)
    .eq('id', id)
    .single()

  if (error || !invoice) {
    notFound()
  }

  // Transform nested arrays
  const transformedInvoice = {
    ...invoice,
    customer: Array.isArray(invoice.customer) ? invoice.customer[0] : invoice.customer,
    job: Array.isArray(invoice.job) ? invoice.job[0] : invoice.job,
    line_items: (invoice.line_items || []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    ),
    payments: (invoice.payments || []).sort(
      (a: { payment_date: string }, b: { payment_date: string }) =>
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    ),
  }

  return (
    <div className="container py-6 max-w-5xl">
      <InvoiceHeader invoice={transformedInvoice} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <InvoiceLineItems
            invoice={transformedInvoice}
            lineItems={transformedInvoice.line_items}
          />
          <InvoicePayments
            invoice={transformedInvoice}
            payments={transformedInvoice.payments}
          />
        </div>
        <div>
          <InvoiceDetails invoice={transformedInvoice} />
        </div>
      </div>
    </div>
  )
}
