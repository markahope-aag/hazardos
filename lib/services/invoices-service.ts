import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import type {
  Invoice,
  InvoiceLineItem,
  Payment,
  CreateInvoiceInput,
  CreateInvoiceFromJobInput,
  AddLineItemInput,
} from '@/types/invoices'

// Default payment windows reflect the company's real policy: residential
// customers get Net 15, commercial customers Net 30. A commercial account
// with a negotiated arrangement overrides via companies.payment_terms.
const DEFAULT_RESIDENTIAL_DUE_DAYS = 15
const DEFAULT_COMMERCIAL_DUE_DAYS = 30

function resolveDueTerms(input: {
  explicitDueDays?: number
  contactType?: string | null
  companyPaymentTerms?: string | null
}): { dueDays: number; paymentTermsLabel: string } {
  // 1. Explicit caller override beats everything.
  if (input.explicitDueDays && input.explicitDueDays > 0) {
    return {
      dueDays: input.explicitDueDays,
      paymentTermsLabel: `Net ${input.explicitDueDays}`,
    }
  }

  // 2. Company's stored payment_terms. We try to parse "Net N" so the
  //    due_date math still works, but fall back to a safe numeric default
  //    while preserving the company's exact label text.
  if (input.companyPaymentTerms) {
    const match = /Net\s+(\d+)/i.exec(input.companyPaymentTerms)
    if (match) {
      return {
        dueDays: parseInt(match[1], 10),
        paymentTermsLabel: input.companyPaymentTerms,
      }
    }
    // Non-standard label (e.g. "Due on receipt", "COD") — keep the label
    // verbatim on the invoice and fall back to 30 days for due_date math.
    return {
      dueDays: DEFAULT_COMMERCIAL_DUE_DAYS,
      paymentTermsLabel: input.companyPaymentTerms,
    }
  }

  // 3. Residential vs commercial default.
  if (input.contactType === 'commercial') {
    return { dueDays: DEFAULT_COMMERCIAL_DUE_DAYS, paymentTermsLabel: `Net ${DEFAULT_COMMERCIAL_DUE_DAYS}` }
  }
  return { dueDays: DEFAULT_RESIDENTIAL_DUE_DAYS, paymentTermsLabel: `Net ${DEFAULT_RESIDENTIAL_DUE_DAYS}` }
}

/**
 * Core invoice data service: CRUD, creation from jobs, line items, and
 * org-scoped stats. Split off from this file:
 *   - InvoiceDeliveryService (lib/services/invoice-delivery-service.ts) —
 *     email/SMS delivery + scheduled reminder cadence
 *   - InvoicePaymentsService (lib/services/invoice-payments-service.ts) —
 *     recording/deleting payments and the paid-state side-effects
 */
export class InvoicesService {
  static async create(input: CreateInvoiceInput): Promise<Invoice> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new SecureError('UNAUTHORIZED')

    const orgId = profile.organization_id

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
        discount_amount: input.discount_amount || 0,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throwDbError(error, 'create invoice')

    // The activity_log 'created' entry is emitted by the trg_activity_invoices
    // DB trigger — no need to log from here.

    return data
  }

  static async createFromJob(input: CreateInvoiceFromJobInput): Promise<Invoice> {
    const supabase = await createClient()

    // Get job with related data. We also pull the customer's company so
    // commercial clients with their own negotiated payment terms get the
    // right default (company.payment_terms overrides the per-type default).
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(*, company:companies!company_id(id, payment_terms)),
        change_orders:job_change_orders(*)
      `)
      .eq('id', input.job_id)
      .single()

    if (jobError || !job) throw new SecureError('NOT_FOUND', 'Job not found')

    // Invoicing an open job is a real money-leak risk: the contract
    // amount can shift right up until completion (change orders,
    // scope adjustments, hazard surprises), so we lock the invoice
    // entry-point behind status='completed'. The UI already hides
    // the button in this state — this is the server-side enforcement
    // for direct API calls.
    if (job.status !== 'completed') {
      throw new SecureError(
        'VALIDATION_ERROR',
        'Cannot invoice this job — it must be marked completed first.',
      )
    }

    // The customer was promised a discount on the estimate they signed —
    // it must follow them onto the invoice or we under-deliver. We pull
    // the dollar amount only (recomputeEstimateTotals already resolved
    // percent vs flat at signing time) and the invoice trigger handles
    // re-deriving total + balance_due once line items land.
    let estimateDiscountAmount = 0
    if (job.estimate_id) {
      const { data: srcEstimate } = await supabase
        .from('estimates')
        .select('discount_amount')
        .eq('id', job.estimate_id)
        .maybeSingle()
      if (srcEstimate?.discount_amount) {
        estimateDiscountAmount = Number(srcEstimate.discount_amount) || 0
      }
    }

    // Resolve due terms:
    //   1. Explicit `due_days` on the request wins (manual override).
    //   2. Else the company's `payment_terms` if it parses as "Net N".
    //   3. Else by contact_type — residential Net 15, commercial Net 30.
    //   4. Final fallback: Net 30.
    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
    const company = customer && 'company' in customer
      ? (Array.isArray(customer.company) ? customer.company[0] : customer.company)
      : null
    const { dueDays, paymentTermsLabel } = resolveDueTerms({
      explicitDueDays: input.due_days,
      contactType: customer?.contact_type,
      companyPaymentTerms: company?.payment_terms,
    })

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + dueDays)

    const invoice = await this.create({
      job_id: input.job_id,
      customer_id: job.customer_id,
      due_date: dueDate.toISOString().split('T')[0],
      payment_terms: paymentTermsLabel,
      discount_amount: estimateDiscountAmount,
    })

    // Collect all line items for batch insert (single query)
    const lineItems: AddLineItemInput[] = []

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

    if (input.include_change_orders !== false) {
      const approvedCOs = (job.change_orders || []).filter(
        (co: { status: string }) => co.status === 'approved',
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

    if (lineItems.length > 0) {
      await this.addLineItemsBatch(invoice.id, lineItems)
    }

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

    return {
      ...data,
      customer: Array.isArray(data.customer) ? data.customer[0] : data.customer,
      job: Array.isArray(data.job) ? data.job[0] : data.job,
      line_items: (data.line_items || []).sort(
        (a: InvoiceLineItem, b: InvoiceLineItem) => a.sort_order - b.sort_order,
      ),
      payments: (data.payments || []).sort(
        (a: Payment, b: Payment) =>
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime(),
      ),
    }
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

    if (error) throwDbError(error, 'fetch invoices')

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

    if (error) throwDbError(error, 'update invoice')
    return data
  }

  static async delete(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.from('invoices').delete().eq('id', id)

    if (error) throwDbError(error, 'delete invoice')
  }

  static async markViewed(id: string): Promise<Invoice> {
    const invoice = await this.getById(id)
    if (!invoice) throw new SecureError('NOT_FOUND', 'Invoice not found')

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

    await Activity.statusChanged('invoice', id, invoice.invoice_number, 'active', 'void')

    // Cancel any pending reminders so the customer isn't chased for an
    // invoice we've voided. Inlined (rather than calling into
    // InvoiceDeliveryService) to keep this module free of a circular
    // dependency with the delivery service, which depends on this one.
    const supabase = await createClient()
    await supabase
      .from('scheduled_reminders')
      .update({ status: 'cancelled' })
      .eq('related_type', 'invoice')
      .eq('related_id', id)
      .eq('status', 'pending')

    return invoice
  }

  // Line items
  static async addLineItem(invoiceId: string, item: AddLineItemInput): Promise<InvoiceLineItem> {
    const supabase = await createClient()

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

    if (error) throwDbError(error, 'create invoice line item')
    return data
  }

  /** Batch insert multiple line items efficiently (single query) */
  static async addLineItemsBatch(
    invoiceId: string,
    items: AddLineItemInput[],
    startSortOrder: number = 0,
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

    if (error) throwDbError(error, 'create invoice line items')
    return data || []
  }

  static async updateLineItem(
    id: string,
    updates: Partial<InvoiceLineItem>,
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

    if (error) throwDbError(error, 'update invoice line item')
    return data
  }

  static async deleteLineItem(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase.from('invoice_line_items').delete().eq('id', id)

    if (error) throwDbError(error, 'delete invoice line item')
  }

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
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new SecureError('UNAUTHORIZED')

    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStartStr = monthStart.toISOString().split('T')[0]

    const [
      draftResult,
      sentResult,
      overdueResult,
      outstandingResult,
      overdueAmountResult,
      paymentsResult,
    ] = await Promise.all([
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('status', 'draft'),
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .in('status', ['sent', 'viewed'])
        .gte('due_date', today),
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .in('status', ['sent', 'viewed'])
        .lt('due_date', today)
        .gt('balance_due', 0),
      supabase
        .from('invoices')
        .select('balance_due')
        .eq('organization_id', profile.organization_id)
        .not('status', 'in', '("paid","void")'),
      supabase
        .from('invoices')
        .select('balance_due')
        .eq('organization_id', profile.organization_id)
        .in('status', ['sent', 'viewed'])
        .lt('due_date', today)
        .gt('balance_due', 0),
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
