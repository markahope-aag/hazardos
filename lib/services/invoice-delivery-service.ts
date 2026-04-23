import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { SmsService } from '@/lib/services/sms-service'
import { InvoicesService } from '@/lib/services/invoices-service'
import { EmailService } from '@/lib/services/email/email-service'
import { formatCurrency } from '@/lib/utils'
import { createServiceLogger, formatError } from '@/lib/utils/logger'
import type { Invoice } from '@/types/invoices'

const log = createServiceLogger('InvoiceDeliveryService')

/**
 * Invoice delivery: email, SMS, and the scheduled_reminders cadence that
 * chases the customer before and after the due date.
 *
 * Kept separate from InvoicesService because the delivery path pulls in
 * Resend, SMS templates, and reminder scheduling — side-effects that
 * shouldn't be in the way of invoice CRUD or the unit tests that cover
 * the database side of things.
 */
export class InvoiceDeliveryService {
  static async send(id: string, method: 'email' | 'sms' = 'email'): Promise<Invoice> {
    const supabase = await createClient()

    const invoice = await InvoicesService.getById(id)
    if (!invoice) throw new SecureError('NOT_FOUND', 'Invoice not found')

    const customer = invoice.customer
    if (!customer) throw new SecureError('BAD_REQUEST', 'Invoice has no customer')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .single()

    if (!profile?.organization_id) throw new SecureError('UNAUTHORIZED')

    const { data: organization } = await supabase
      .from('organizations')
      .select('name, email, phone, address, city, state, zip, website')
      .eq('id', profile.organization_id)
      .single()

    try {
      if (method === 'email') {
        await this.sendInvoiceEmail(invoice, customer, organization, profile.organization_id)
      } else if (method === 'sms') {
        await this.sendInvoiceSms(invoice, customer, profile.organization_id)
      }
    } catch (error) {
      log.error(
        { operation: 'send', error: formatError(error), invoiceId: id, method },
        'Failed to send invoice',
      )
      throw error
    }

    const updatedInvoice = await InvoicesService.update(id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_via: method,
    } as Partial<Invoice>)

    await Activity.sent('invoice', id, invoice.invoice_number)

    // Queue payment reminders (SMS) tied to the due date. Guarded by the
    // org's payment_reminders_enabled toggle — no scheduled rows are created
    // if the feature is off.
    try {
      await this.schedulePaymentReminders(updatedInvoice, profile.organization_id)
    } catch (e) {
      log.warn(
        { invoiceId: id, err: formatError(e) },
        'failed to schedule payment reminders; invoice send itself succeeded',
      )
    }

    return updatedInvoice
  }

  /**
   * Cancel pending payment reminders for an invoice. Called when the
   * invoice is paid or voided so the customer doesn't get a "due today"
   * text after already paying. Public so InvoicesService.void and
   * InvoicePaymentsService.recordPayment can invoke it.
   */
  static async cancelPaymentReminders(invoiceId: string): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('scheduled_reminders')
      .update({ status: 'cancelled' })
      .eq('related_type', 'invoice')
      .eq('related_id', invoiceId)
      .eq('status', 'pending')
  }

  // Creates scheduled_reminders rows for a just-sent invoice:
  //   - 3 days before due_date (early nudge)
  //   - on the due date (due-today nudge)
  //   - 3 days after due_date (overdue nudge)
  // All SMS. Skipped entirely if the org toggle is off or the customer
  // isn't opted into SMS / has no phone.
  private static async schedulePaymentReminders(
    invoice: Invoice,
    organizationId: string,
  ): Promise<void> {
    if (!invoice.due_date) return
    const customer = invoice.customer
    if (!customer?.phone) return

    const supabase = await createClient()

    const { data: smsSettings } = await supabase
      .from('organization_sms_settings')
      .select('payment_reminders_enabled, sms_enabled')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (!smsSettings?.sms_enabled || !smsSettings?.payment_reminders_enabled) return

    // Cancel any prior pending reminders for this invoice so reschedules
    // don't duplicate.
    await supabase
      .from('scheduled_reminders')
      .update({ status: 'cancelled' })
      .eq('related_type', 'invoice')
      .eq('related_id', invoice.id)
      .eq('status', 'pending')

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()
    const companyName = org?.name || 'HazardOS'

    const due = new Date(invoice.due_date)
    const now = new Date()

    const commonVars = {
      company_name: companyName,
      invoice_number: invoice.invoice_number,
      amount: formatCurrency(invoice.balance_due),
      due_date: due.toLocaleDateString(),
      pay_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/pay/${invoice.id}`,
    }

    const reminderSpecs: Array<{ daysOffset: number; slug: string }> = [
      { daysOffset: -3, slug: 'payment_reminder_pre_due' },
      { daysOffset: 0, slug: 'payment_reminder_due' },
      { daysOffset: 3, slug: 'payment_reminder_overdue' },
    ]

    const rows: Array<Record<string, unknown>> = []
    for (const spec of reminderSpecs) {
      const when = new Date(due)
      when.setDate(when.getDate() + spec.daysOffset)
      when.setHours(10, 0, 0, 0)
      if (when <= now) continue
      rows.push({
        organization_id: organizationId,
        related_type: 'invoice',
        related_id: invoice.id,
        reminder_type: spec.slug,
        recipient_type: 'customer',
        recipient_email: customer.email,
        recipient_phone: customer.phone,
        channel: 'sms',
        scheduled_for: when.toISOString(),
        template_slug: spec.slug,
        template_variables: commonVars,
      })
    }

    if (rows.length > 0) {
      await supabase.from('scheduled_reminders').insert(rows)
    }
  }

  private static async sendInvoiceEmail(
    invoice: Invoice,
    customer: NonNullable<Invoice['customer']>,
    organization: {
      name: string | null
      email: string | null
      phone: string | null
      address: string | null
      city: string | null
      state: string | null
      zip: string | null
      website: string | null
    } | null,
    organizationId: string,
  ): Promise<void> {
    if (!customer.email) {
      throw new SecureError('VALIDATION_ERROR', 'Customer has no email address', 'email')
    }

    const customerName = customer.company_name || customer.name || 'Customer'
    const companyName = organization?.name || 'HazardOS'
    const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.id}`

    const lineItemsHtml = invoice.line_items?.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unit_price)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.line_total)}</td>
      </tr>
    `).join('') || ''

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f97316; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">${companyName}</h1>
        </div>

        <div style="padding: 24px;">
          <h2 style="color: #1f2937;">Invoice ${invoice.invoice_number}</h2>

          <p>Dear ${customerName},</p>

          <p>Please find your invoice details below. The total amount due is <strong>${formatCurrency(invoice.balance_due)}</strong> by ${new Date(invoice.due_date).toLocaleDateString()}.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 8px; text-align: left;">Description</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Price</th>
                <th style="padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; margin-top: 20px;">
            <p style="margin: 4px 0;">Subtotal: ${formatCurrency(invoice.subtotal)}</p>
            ${invoice.tax_amount > 0 ? `<p style="margin: 4px 0;">Tax: ${formatCurrency(invoice.tax_amount)}</p>` : ''}
            ${invoice.discount_amount > 0 ? `<p style="margin: 4px 0;">Discount: -${formatCurrency(invoice.discount_amount)}</p>` : ''}
            <p style="margin: 8px 0; font-size: 18px; font-weight: bold;">Total Due: ${formatCurrency(invoice.balance_due)}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentUrl}" style="display: inline-block; padding: 14px 32px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Pay Now</a>
          </div>

          ${invoice.notes ? `<p style="margin-top: 20px; padding: 12px; background-color: #f3f4f6; border-radius: 4px;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}

          <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;" />

          <p style="font-size: 12px; color: #6b7280; text-align: center;">
            ${companyName}${organization?.address ? ` | ${organization.address}` : ''}${organization?.phone ? ` | ${organization.phone}` : ''}
          </p>
        </div>
      </div>
    `

    await EmailService.send(
      organizationId,
      {
        to: customer.email,
        subject: `Invoice ${invoice.invoice_number} from ${companyName} - ${formatCurrency(invoice.balance_due)} Due`,
        html: emailHtml,
        tags: ['invoice'],
        relatedEntity: { type: 'invoice', id: invoice.id },
      },
    )

    log.info(
      { operation: 'sendInvoiceEmail', invoiceId: invoice.id, customerEmail: customer.email },
      'Invoice email sent',
    )
  }

  private static async sendInvoiceSms(
    invoice: Invoice,
    customer: NonNullable<Invoice['customer']>,
    organizationId: string,
  ): Promise<void> {
    if (!customer.phone) {
      throw new SecureError('VALIDATION_ERROR', 'Customer has no phone number', 'phone')
    }

    const supabase = await createClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    // Use the system payment_reminder template so wording is consistent
    // with scheduled reminders and orgs can override it. message_type is
    // derived from the template (payment_reminder — a valid enum value).
    await SmsService.sendTemplated(organizationId, {
      to: customer.phone,
      template_type: 'payment_reminder',
      variables: {
        company_name: org?.name || 'HazardOS',
        invoice_number: invoice.invoice_number,
        amount: formatCurrency(invoice.balance_due),
        due_date: new Date(invoice.due_date).toLocaleDateString(),
      },
      customer_id: customer.id,
      related_entity_type: 'invoice',
      related_entity_id: invoice.id,
    })

    log.info(
      { operation: 'sendInvoiceSms', invoiceId: invoice.id, customerPhone: customer.phone },
      'Invoice SMS sent',
    )
  }
}
