import { redirect } from 'next/navigation'
import { SubscriptionCard } from '@/components/billing/subscription-card'
import { InvoiceHistory } from '@/components/billing/invoice-history'
import { PlanSelector } from '@/components/billing/plan-selector'
import { requireTenantAdmin } from '@/lib/auth/require-roles'
import type { OrganizationSubscription, SubscriptionPlan, BillingInvoice } from '@/types/billing'

export default async function BillingSettingsPage() {
  const { profile, supabase } = await requireTenantAdmin()

  // Orgs on a custom/manual billing arrangement have the in-app
  // billing flow turned off; bounce them back to settings home.
  const { data: org } = await supabase
    .from('organizations')
    .select('billing_managed_externally')
    .eq('id', profile.organization_id)
    .single()

  if (org?.billing_managed_externally) redirect('/settings')

  // Get subscription
  const { data: subscriptionData } = await supabase
    .from('organization_subscriptions')
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq('organization_id', profile.organization_id)
    .single()

  // Transform the data to match our types
  const subscription: OrganizationSubscription | null = subscriptionData ? {
    ...subscriptionData,
    plan: Array.isArray(subscriptionData.plan) ? subscriptionData.plan[0] : subscriptionData.plan,
  } : null

  // Get invoices
  const { data: invoicesData } = await supabase
    .from('billing_invoices')
    .select('id, organization_id, subscription_id, stripe_invoice_id, stripe_payment_intent_id, invoice_number, status, subtotal, tax, total, amount_paid, amount_due, invoice_date, due_date, paid_at, invoice_pdf_url, hosted_invoice_url, created_at')
    .eq('organization_id', profile.organization_id)
    .order('invoice_date', { ascending: false })
    .limit(10)

  const invoices: BillingInvoice[] = invoicesData || []

  // Get all plans
  const { data: plansData } = await supabase
    .from('subscription_plans')
    .select('id, name, slug, description, price_monthly, price_yearly, stripe_product_id, stripe_price_id_monthly, stripe_price_id_yearly, max_users, max_jobs_per_month, max_storage_gb, features, feature_flags, is_active, is_public, display_order, created_at, updated_at')
    .eq('is_active', true)
    .eq('is_public', true)
    .order('display_order')

  const plans: SubscriptionPlan[] = plansData || []

  // requireTenantAdmin already enforced this — keeping the variable for
  // any UI branches below that may want to be defensive.
  const isAdmin = true

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Current Subscription */}
        <SubscriptionCard
          subscription={subscription}
          isAdmin={isAdmin}
        />

        {/* Plan Selection */}
        {isAdmin && (
          <PlanSelector
            plans={plans}
            currentPlanId={subscription?.plan_id}
          />
        )}

        {/* Invoice History */}
        <InvoiceHistory invoices={invoices} />
      </div>
    </div>
  )
}
