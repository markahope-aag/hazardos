import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { SmsService } from '@/lib/services/sms-service'
import { formatCurrency } from '@/lib/utils'
import { createServiceLogger, formatError } from '@/lib/utils/logger'
import type {
  Invoice,
  InvoiceLineItem,
  Payment,
  CreateInvoiceInput,
  CreateInvoiceFromJobInput,
  AddLineItemInput,
  RecordPaymentInput,
} from '@/types/invoices'

const log = createServiceLogger('InvoicesService')

export class InvoicesService {
  static async create(input: CreateInvoiceInput): Promise<Invoice> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    const orgId = profile.organization_id

    // Generate invoice number
    const { data: invoiceNumber } = await supabase
      .rpc('generate_invoice_number', { org_id: orgId })

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: orgId,
        invoice_number: invoiceNumber,
        customer_id: input.customer_id,
        job_id: input.job_id || null,
        due_date: input.due_date,
        payment_terms: input.payment_terms || null,
        notes: input.notes || null,
        tax_rate: input.tax_rate || 0,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await Activity.created('invoice', data.id, data.invoice_number)

    return data
  }

  static async createFromJob(input: CreateInvoiceFromJobInput): Promise<Invoice> {
    const supabase = await createClient()

    // Get job with related data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*),
        change_orders:job_change_orders(*)
      `)
      .eq('id', input.job_id)
      .single()

    if (jobError || !job) throw new Error('Job not found')

    // Calculate due date
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (input.due_days || 30))

    // Create invoice
    const invoice = await this.create({
      job_id: input.job_id,
      customer_id: job.customer_id,
      due_date: dueDate.toISOString().split('T')[0],
      payment_terms: `Net ${input.due_days || 30}`,
    })

    // Collect all line items for batch insert (single query)
    const lineItems: AddLineItemInput[] = []

    // Add main job amount as line item
    const jobAmount = job.final_amount || job.contract_amount
    if (jobAmount) {
      lineItems.push({
        description: `Remediation services - Job #${job.job_number}`,
        quantity: 1,
        unit: 'job',
        unit_price: jobAmount,
        source_type: 'job',
        source_id: job.id,
      })
    }

    // Add approved change orders
    if (input.include_change_orders !== false) {
      const approvedCOs = (job.change_orders || []).filter(
        (co: { status: string }) => co.status === 'approved'
      )

      for (const co of approvedCOs) {
        lineItems.push({
          description: `Change Order: ${co.description}`,
          quantity: 1,
          unit: 'each',
          unit_price: co.amount,
          source_type: 'change_order',
          source_id: co.id,
        })
      }
    }

    // Batch insert all line items in a single query
    if (lineItems.length > 0) {
      await this.addLineItemsBatch(invoice.id, lineItems)
    }

    // Update job status to invoiced
    await supabase
      .from('jobs')
      .update({ status: 'invoiced', updated_at: new Date().toISOString() })
      .eq('id', input.job_id)

    return (await this.getById(invoice.id)) as Invoice
  }

  static async getById(id: string): Promise<Invoice | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
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

    if (error) return null

    // Transform nested arrays
    const transformed = {
      ...data,
      customer: Array.isArray(data.customer) ? data.customer[0] : data.customer,
      job: Array.isArray(data.job) ? data.job[0] : data.job,
      line_items: (data.line_items || []).sort(
        (a: InvoiceLineItem, b: InvoiceLineItem) => a.sort_order - b.sort_order
      ),
      payments: (data.payments || []).sort(
        (a: Payment, b: Payment) =>
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      ),
    }

    return transformed
  }

  static async list(filters?: {
    status?: string
    customer_id?: string
    job_id?: string
    from_date?: string
    to_date?: string
    overdue_only?: boolean
  }): Promise<Invoice[]> {
    const supabase = await createClient()

    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(id, name, company_name, email),
        job:jobs(id, job_number)
      `)
      .order('invoice_date', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id)
    }
    if (filters?.job_id) {
      query = query.eq('job_id', filters.job_id)
    }
    if (filters?.from_date) {
      query = query.gte('invoice_date', filters.from_date)
    }
    if (filters?.to_date) {
      query = query.lte('invoice_date', filters.to_date)
    }
    if (filters?.overdue_only) {
      const today = new Date().toISOString().split('T')[0]
      query = query
        .lt('due_date', today)
        .gt('balance_due', 0)
        .not('status', 'in', '("paid","void")')
    }

    const { data, error } = await query

    if (error) throw error

    // Transform nested arrays
    return (data || []).map((inv) => ({
      ...inv,
      customer: Array.isArray(inv.customer) ? inv.customer[0] : inv.customer,
      job: Array.isArray(inv.job) ? inv.job[0] : inv.job,
    }))
  }

  static async update(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('invoices')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async delete(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.from('invoices').delete().eq('id', id)

    if (error) throw error
  }

  static async send(id: string, method: 'email' | 'sms' = 'email'): Promise<Invoice> {
    const supabase = await createClient()

    // Get the full invoice with customer data
    const invoice = await this.getById(id)
    if (!invoice) throw new Error('Invoice not found')

    const customer = invoice.customer
    if (!customer) throw new Error('Invoice has no customer')

    // Get organization info for branding
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

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
        'Failed to send invoice'
      )
      // Still update status even if send fails, but log the error
      throw error
    }

    // Update invoice status
    const updatedInvoice = await this.update(id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_via: method,
    } as Partial<Invoice>)

    // Log activity
    await Activity.sent('invoice', id, invoice.invoice_number)

    return updatedInvoice
  }

  private static async sendInvoiceEmail(
    invoice: Invoice,
    customer: NonNullable<Invoice['customer']>,
    organization: { name: string | null; email: string | null; phone: string | null; address: string | null; city: string | null; state: string | null; zip: string | null; website: string | null } | null,
    _organizationId: string
  ): Promise<void> {
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      throw new Error('Email service not configured (RESEND_API_KEY missing)')
    }

    if (!customer.email) {
      throw new Error('Customer has no email address')
    }

    const { Resend } = await import('resend')
    const resend = new Resend(resendApiKey)

    const customerName = customer.company_name || customer.name || 'Customer'
    const companyName = organization?.name || 'HazardOS'
    const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.id}`

    // Generate line items HTML
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

    await resend.emails.send({
      from: `${companyName} <invoices@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: customer.email,
      subject: `Invoice ${invoice.invoice_number} from ${companyName} - ${formatCurrency(invoice.balance_due)} Due`,
      html: emailHtml,
    })

    log.info(
      { operation: 'sendInvoiceEmail', invoiceId: invoice.id, customerEmail: customer.email },
      'Invoice email sent'
    )
  }

  private static async sendInvoiceSms(
    invoice: Invoice,
    customer: NonNullable<Invoice['customer']>,
    organizationId: string
  ): Promise<void> {
    if (!customer.phone) {
      throw new Error('Customer has no phone number')
    }

    const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.id}`

    await SmsService.send(organizationId, {
      to: customer.phone,
      body: `Invoice ${invoice.invoice_number}: ${formatCurrency(invoice.balance_due)} due by ${new Date(invoice.due_date).toLocaleDateString()}. Pay now: ${paymentUrl}`,
      message_type: 'invoice',
      customer_id: customer.id,
      related_entity_type: 'invoice',
      related_entity_id: invoice.id,
    })

    log.info(
      { operation: 'sendInvoiceSms', invoiceId: invoice.id, customerPhone: customer.phone },
      'Invoice SMS sent'
    )
  }

  static async markViewed(id: string): Promise<Invoice> {
    const invoice = await this.getById(id)
    if (!invoice) throw new Error('Invoice not found')

    if (invoice.status === 'sent') {
      return this.update(id, {
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      } as Partial<Invoice>)
    }

    return invoice
  }

  static async void(id: string): Promise<Invoice> {
    const invoice = await this.update(id, { status: 'void' } as Partial<Invoice>)

    // Log activity
    await Activity.statusChanged('invoice', id, invoice.invoice_number, 'active', 'void')

    return invoice
  }

  // Line items
  static async addLineItem(invoiceId: string, item: AddLineItemInput): Promise<InvoiceLineItem> {
    const supabase = await createClient()

    // Get max sort order
    const { data: existing } = await supabase
      .from('invoice_line_items')
      .select('sort_order')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

    const { data, error } = await supabase
      .from('invoice_line_items')
      .insert({
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || null,
        unit_price: item.unit_price,
        line_total: item.quantity * item.unit_price,
        source_type: item.source_type || null,
        source_id: item.source_id || null,
        sort_order: sortOrder,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Batch insert multiple line items efficiently (single query)
   */
  static async addLineItemsBatch(
    invoiceId: string,
    items: AddLineItemInput[],
    startSortOrder: number = 0
  ): Promise<InvoiceLineItem[]> {
    if (items.length === 0) return []

    const supabase = await createClient()

    const lineItems = items.map((item, index) => ({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit || null,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
      source_type: item.source_type || null,
      source_id: item.source_id || null,
      sort_order: startSortOrder + index,
    }))

    const { data, error } = await supabase
      .from('invoice_line_items')
      .insert(lineItems)
      .select()

    if (error) throw error
    return data || []
  }

  static async updateLineItem(
    id: string,
    updates: Partial<InvoiceLineItem>
  ): Promise<InvoiceLineItem> {
    const supabase = await createClient()

    // Recalculate line_total if quantity or unit_price changed
    if (updates.quantity !== undefined || updates.unit_price !== undefined) {
      const { data: current } = await supabase
        .from('invoice_line_items')
        .select('id, quantity, unit_price')
        .eq('id', id)
        .single()

      const qty = updates.quantity ?? current?.quantity ?? 1
      const price = updates.unit_price ?? current?.unit_price ?? 0
      updates.line_total = qty * price
    }

    const { data, error } = await supabase
      .from('invoice_line_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteLineItem(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.from('invoice_line_items').delete().eq('id', id)

    if (error) throw error
  }

  // Payments
  static async recordPayment(invoiceId: string, payment: RecordPaymentInput): Promise<Payment> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

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

    if (error) throw error

    // Update job status to paid if invoice is now paid
    const invoice = await this.getById(invoiceId)
    if (invoice?.status === 'paid' && invoice.job_id) {
      await supabase
        .from('jobs')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', invoice.job_id)
    }

    // Log activity
    await Activity.paid('invoice', invoiceId, invoice?.invoice_number, payment.amount)

    return data
  }

  static async deletePayment(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.from('payments').delete().eq('id', id)

    if (error) throw error
  }

  // Stats
  static async getStats(): Promise<{
    total_outstanding: number
    total_overdue: number
    draft_count: number
    sent_count: number
    overdue_count: number
    paid_this_month: number
  }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStartStr = monthStart.toISOString().split('T')[0]

    // Run all queries in parallel for better performance
    const [
      draftResult,
      sentResult,
      overdueResult,
      outstandingResult,
      overdueAmountResult,
      paymentsResult,
    ] = await Promise.all([
      // Draft count
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('status', 'draft'),
      // Sent count (sent, viewed but not overdue)
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .in('status', ['sent', 'viewed'])
        .gte('due_date', today),
      // Overdue count
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .in('status', ['sent', 'viewed'])
        .lt('due_date', today)
        .gt('balance_due', 0),
      // Total outstanding (sum of balance_due for non-paid, non-void)
      supabase
        .from('invoices')
        .select('balance_due')
        .eq('organization_id', profile.organization_id)
        .not('status', 'in', '("paid","void")'),
      // Total overdue amount
      supabase
        .from('invoices')
        .select('balance_due')
        .eq('organization_id', profile.organization_id)
        .in('status', ['sent', 'viewed'])
        .lt('due_date', today)
        .gt('balance_due', 0),
      // Paid this month
      supabase
        .from('payments')
        .select('amount')
        .eq('organization_id', profile.organization_id)
        .gte('payment_date', monthStartStr),
    ])

    return {
      draft_count: draftResult.count || 0,
      sent_count: sentResult.count || 0,
      overdue_count: overdueResult.count || 0,
      total_outstanding: (outstandingResult.data || []).reduce((sum, i) => sum + (i.balance_due || 0), 0),
      total_overdue: (overdueAmountResult.data || []).reduce((sum, i) => sum + (i.balance_due || 0), 0),
      paid_this_month: (paymentsResult.data || []).reduce((sum, p) => sum + (p.amount || 0), 0),
    }
  }
}
