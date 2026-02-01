import { createClient } from '@/lib/supabase/server'
import type {
  Invoice,
  InvoiceLineItem,
  Payment,
  CreateInvoiceInput,
  CreateInvoiceFromJobInput,
  AddLineItemInput,
  RecordPaymentInput,
} from '@/types/invoices'

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

    // Add main job amount as line item
    const jobAmount = job.final_amount || job.contract_amount
    if (jobAmount) {
      await this.addLineItem(invoice.id, {
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
        await this.addLineItem(invoice.id, {
          description: `Change Order: ${co.description}`,
          quantity: 1,
          unit: 'each',
          unit_price: co.amount,
          source_type: 'change_order',
          source_id: co.id,
        })
      }
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
    // TODO: Integrate with email service to send invoice PDF
    return this.update(id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_via: method,
    } as Partial<Invoice>)
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
    return this.update(id, { status: 'void' } as Partial<Invoice>)
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

  static async updateLineItem(
    id: string,
    updates: Partial<InvoiceLineItem>
  ): Promise<InvoiceLineItem> {
    const supabase = await createClient()

    // Recalculate line_total if quantity or unit_price changed
    if (updates.quantity !== undefined || updates.unit_price !== undefined) {
      const { data: current } = await supabase
        .from('invoice_line_items')
        .select('*')
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

    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date()
    monthStart.setDate(1)

    const { data: invoices } = await supabase
      .from('invoices')
      .select('status, balance_due, due_date, total')

    const { data: paidThisMonth } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', monthStart.toISOString().split('T')[0])

    const stats = {
      total_outstanding: 0,
      total_overdue: 0,
      draft_count: 0,
      sent_count: 0,
      overdue_count: 0,
      paid_this_month: paidThisMonth?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    }

    for (const inv of invoices || []) {
      if (inv.status === 'void' || inv.status === 'paid') continue

      stats.total_outstanding += inv.balance_due || 0

      if (inv.status === 'draft') {
        stats.draft_count++
      } else if (inv.due_date < today && inv.balance_due > 0) {
        stats.total_overdue += inv.balance_due
        stats.overdue_count++
      } else {
        stats.sent_count++
      }
    }

    return stats
  }
}
