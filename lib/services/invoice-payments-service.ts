import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { InvoicesService } from '@/lib/services/invoices-service'
import { InvoiceDeliveryService } from '@/lib/services/invoice-delivery-service'
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

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('payments')
      .insert({
        organization_id: profile.organization_id,
        invoice_id: invoiceId,
        amount: payment.amount,
        payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
        payment_method: payment.payment_method || null,
        reference_number: payment.reference_number || null,
        notes: payment.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throwDbError(error, 'create payment')

    // Update job status to paid if invoice is now paid, and cancel any
    // pending SMS payment reminders so the customer isn't chased for an
    // invoice they've already cleared.
    const invoice = await InvoicesService.getById(invoiceId)
    if (invoice?.status === 'paid') {
      await InvoiceDeliveryService.cancelPaymentReminders(invoiceId)
      if (invoice.job_id) {
        await supabase
          .from('jobs')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', invoice.job_id)
      }
    }

    await Activity.paid('invoice', invoiceId, invoice?.invoice_number, payment.amount)

    return data
  }

  static async deletePayment(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.from('payments').delete().eq('id', id)

    if (error) throwDbError(error, 'delete payment')
  }
}
