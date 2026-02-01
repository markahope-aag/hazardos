// Invoice Types for HazardOS

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'void'

export type PaymentMethod =
  | 'check'
  | 'credit_card'
  | 'ach'
  | 'cash'
  | 'other'

export interface Invoice {
  id: string
  organization_id: string
  job_id: string | null
  customer_id: string
  invoice_number: string
  status: InvoiceStatus
  invoice_date: string
  due_date: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  amount_paid: number
  balance_due: number
  payment_terms: string | null
  notes: string | null
  sent_at: string | null
  sent_via: string | null
  viewed_at: string | null
  qb_invoice_id: string | null
  qb_synced_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string

  // Relations
  customer?: {
    id: string
    name: string
    company_name: string | null
    email: string | null
    phone: string | null
    address_line1: string | null
    city: string | null
    state: string | null
    zip: string | null
  }
  job?: {
    id: string
    job_number: string
    job_address: string
    job_city: string | null
    job_state: string | null
  }
  line_items?: InvoiceLineItem[]
  payments?: Payment[]
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  line_total: number
  source_type: string | null
  source_id: string | null
  sort_order: number
  created_at: string
}

export interface Payment {
  id: string
  organization_id: string
  invoice_id: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod | null
  reference_number: string | null
  notes: string | null
  qb_payment_id: string | null
  qb_synced_at: string | null
  created_by: string | null
  created_at: string
}

// Input types
export interface CreateInvoiceInput {
  job_id?: string
  customer_id: string
  due_date: string
  payment_terms?: string
  notes?: string
  tax_rate?: number
}

export interface CreateInvoiceFromJobInput {
  job_id: string
  due_days?: number
  include_change_orders?: boolean
}

export interface AddLineItemInput {
  description: string
  quantity: number
  unit?: string
  unit_price: number
  source_type?: string
  source_id?: string
}

export interface RecordPaymentInput {
  amount: number
  payment_date?: string
  payment_method?: PaymentMethod
  reference_number?: string
  notes?: string
}

// Status config for UI
export const invoiceStatusConfig: Record<InvoiceStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  sent: { label: 'Sent', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  viewed: { label: 'Viewed', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  partial: { label: 'Partial', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  paid: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
  overdue: { label: 'Overdue', color: 'text-red-700', bgColor: 'bg-red-100' },
  void: { label: 'Void', color: 'text-gray-500', bgColor: 'bg-gray-100' },
}

export const paymentMethodConfig: Record<PaymentMethod, { label: string }> = {
  check: { label: 'Check' },
  credit_card: { label: 'Credit Card' },
  ach: { label: 'ACH/Bank Transfer' },
  cash: { label: 'Cash' },
  other: { label: 'Other' },
}
