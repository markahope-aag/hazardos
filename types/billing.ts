// Billing & Subscription Types
// Phase 5: Platform Owner Layer

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'

export type BillingCycle = 'monthly' | 'yearly'

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'

export interface SubscriptionPlan {
  id: string
  name: string
  slug: string
  description: string | null
  price_monthly: number
  price_yearly: number | null
  stripe_product_id: string | null
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
  max_users: number | null
  max_jobs_per_month: number | null
  max_storage_gb: number | null
  features: string[]
  feature_flags: Record<string, boolean>
  is_active: boolean
  is_public: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface OrganizationSubscription {
  id: string
  organization_id: string
  plan_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  current_period_start: string | null
  current_period_end: string | null
  trial_start: string | null
  trial_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  cancellation_reason: string | null
  users_count: number
  jobs_this_month: number
  storage_used_mb: number
  created_at: string
  updated_at: string
  // Joined
  plan?: SubscriptionPlan
}

export interface BillingInvoice {
  id: string
  organization_id: string
  subscription_id: string | null
  stripe_invoice_id: string | null
  stripe_payment_intent_id: string | null
  invoice_number: string | null
  status: InvoiceStatus
  subtotal: number
  tax: number
  total: number
  amount_paid: number
  amount_due: number
  invoice_date: string | null
  due_date: string | null
  paid_at: string | null
  invoice_pdf_url: string | null
  hosted_invoice_url: string | null
  created_at: string
}

export interface PaymentMethod {
  id: string
  organization_id: string
  stripe_payment_method_id: string
  card_brand: string
  card_last4: string
  card_exp_month: number
  card_exp_year: number
  is_default: boolean
  created_at: string
}

// API inputs
export interface CreateCheckoutInput {
  plan_slug: string
  billing_cycle: BillingCycle
  success_url: string
  cancel_url: string
}

export interface UpdateSubscriptionInput {
  plan_slug?: string
  billing_cycle?: BillingCycle
}

export interface CancelSubscriptionInput {
  reason?: string
  cancel_immediately?: boolean
}

// Usage limits
export interface UsageLimits {
  withinLimits: boolean
  users: { current: number; max: number | null }
  jobs: { current: number; max: number | null }
  storage: { current: number; max: number | null }
}

// Feature flags
export type FeatureFlag =
  | 'quickbooks'
  | 'api_access'
  | 'custom_branding'
  | 'advanced_reporting'
  | 'priority_support'

// Status display config
export const subscriptionStatusConfig: Record<SubscriptionStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  trialing: { label: 'Trial', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  active: { label: 'Active', color: 'text-green-700', bgColor: 'bg-green-100' },
  past_due: { label: 'Past Due', color: 'text-red-700', bgColor: 'bg-red-100' },
  canceled: { label: 'Canceled', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  unpaid: { label: 'Unpaid', color: 'text-red-700', bgColor: 'bg-red-100' },
  incomplete: { label: 'Incomplete', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
}

export const invoiceStatusConfig: Record<InvoiceStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  open: { label: 'Open', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  paid: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
  void: { label: 'Void', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  uncollectible: { label: 'Uncollectible', color: 'text-red-700', bgColor: 'bg-red-100' },
}
