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
 */
export interface PaymentStatusBadge {
  label: string
  color: string
}

export function getJobPaymentStatus(job: Record<string, unknown>): PaymentStatusBadge {
  if (job.status === 'paid' || job.final_payment_date) {
    return { label: 'Paid', color: 'bg-emerald-100 text-emerald-700' }
  }
  if (job.status === 'cancelled') {
    return { label: '—', color: '' }
  }
  // Overdue: an invoice has been sent, is past its due date, and isn't paid.
  if ((job.final_invoice_date || job.status === 'invoiced') && job.invoice_due_date) {
    const dueDate = new Date(job.invoice_due_date as string)
    if (dueDate < new Date()) {
      return { label: 'Overdue', color: 'bg-red-100 text-red-700' }
    }
  }
  if (job.final_invoice_date || job.status === 'invoiced') {
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
