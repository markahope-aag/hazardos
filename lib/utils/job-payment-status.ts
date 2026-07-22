/**
 * Canonical job payment-status badge derivation.
 *
 * Previously the CRM jobs LIST and the job DETAIL page each had their own
 * getPaymentStatus() with divergent logic (JB11): the list had an "Overdue"
 * state and checked invoiced-before-deposit, while the detail lacked Overdue,
 * checked deposit-before-invoiced, and used different labels ("Paid" vs
 * "Paid in Full", "Unpaid" vs "Pending Invoice"/"Not Yet Billed"). The same
 * job could show two different payment statuses. This single source of truth
 * fixes that — both surfaces import it.
 *
 * The parameter used to be `Record<string, unknown>`, which switched off type
 * checking on every field access. Under that signature the Overdue branch read
 * `job.invoice_due_date` — a column that exists nowhere in the schema, the
 * types, or any query (jobs has final_invoice_date, deposit_received_date and
 * final_payment_date; the due date lives on invoices.due_date). It compiled,
 * and Overdue could never render on either surface.
 *
 * The due date now arrives as an explicit argument, so the dependency is
 * visible at the call site and checked by the compiler. Neither caller joins
 * invoices today, so Overdue stays dormant — but wiring it is now a one-line
 * change at the call site rather than a silent no-op.
 */
export interface PaymentStatusBadge {
  label: string
  color: string
}

/** The subset of a job this derivation actually reads. */
export interface JobPaymentFields {
  status?: string | null
  final_payment_date?: string | null
  final_invoice_date?: string | null
  deposit_received_date?: string | null
}

export function getJobPaymentStatus(
  job: JobPaymentFields,
  /** invoices.due_date for this job's invoice, when the caller has joined it. */
  invoiceDueDate?: string | null,
): PaymentStatusBadge {
  if (job.status === 'paid' || job.final_payment_date) {
    return { label: 'Paid', color: 'bg-emerald-100 text-emerald-700' }
  }
  if (job.status === 'cancelled') {
    return { label: '—', color: '' }
  }

  const isInvoiced = Boolean(job.final_invoice_date) || job.status === 'invoiced'

  // Overdue: an invoice has been sent, is past its due date, and isn't paid.
  if (isInvoiced && invoiceDueDate) {
    if (new Date(invoiceDueDate) < new Date()) {
      return { label: 'Overdue', color: 'bg-red-100 text-red-700' }
    }
  }
  if (isInvoiced) {
    return { label: 'Invoiced', color: 'bg-purple-100 text-purple-700' }
  }
  if (job.deposit_received_date) {
    return { label: 'Deposit Received', color: 'bg-blue-100 text-blue-700' }
  }
  if (job.status === 'completed') {
    return { label: 'Pending Invoice', color: 'bg-amber-100 text-amber-700' }
  }
  if (job.status === 'in_progress' || job.status === 'scheduled') {
    return { label: 'Not Yet Billed', color: 'bg-gray-100 text-gray-600' }
  }
  return { label: '—', color: '' }
}
