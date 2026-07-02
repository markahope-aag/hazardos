import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/server-auth'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { InvoicesService } from '@/lib/services/invoices-service'
import type { Payment, RecordPaymentInput } from '@/types/invoices'

/**
 * Payment records attached to invoices. Splitting these off keeps the
 * payment flow — which has its own downstream effects (auto-marking the
 * parent job paid, cancelling pending reminder SMS) — out of the core
 * InvoicesService. Deleting a payment doesn't reverse those effects;
 * that's accepted behavior because manual cleanup is an admin task.
 */
export class InvoicePaymentsService {
  static async recordPayment(invoiceId: string, payment: RecordPaymentInput): Promise<Payment> {
    const supabase = await createClient()

    const user = await getCurrentUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    // Atomic write: insert the payment (whose trigger recomputes the invoice
    // balance/status) and, if the invoice is now fully paid, cancel pending
    // reminders and mark the job 'paid' — all in one transaction. Previously
    // these were separate round-trips, so a failure after the payment insert
    // could leave a paid invoice with a still-'invoiced' job or a reminder SMS
    // that keeps chasing a customer who already paid.
    const { data, error } = await supabase.rpc('record_invoice_payment', {
      p_invoice_id: invoiceId,
      p_amount: payment.amount,
      p_payment_date: payment.payment_date || null,
      p_payment_method: payment.payment_method || null,
      p_reference_number: payment.reference_number || null,
      p_notes: payment.notes || null,
      p_created_by: user.id,
    })

    if (error) throwDbError(error, 'record payment')

    // Activity logging stays outside the transaction — a logging failure must
    // not roll back a recorded payment. Read the invoice number for the entry.
    const invoice = await InvoicesService.getById(invoiceId)
    await Activity.paid('invoice', invoiceId, invoice?.invoice_number, payment.amount)

    return data as unknown as Payment
  }

  static async deletePayment(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.from('payments').delete().eq('id', id)

    if (error) throwDbError(error, 'delete payment')
  }
}
