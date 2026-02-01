import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubscriptionCard } from '@/components/billing/subscription-card'
import { InvoiceHistory } from '@/components/billing/invoice-history'
import { PlanSelector } from '@/components/billing/plan-selector'
import type { OrganizationSubscription, SubscriptionPlan, BillingInvoice } from '@/types/billing'

export default async function BillingSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) redirect('/onboard')

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
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('invoice_date', { ascending: false })
    .limit(10)

  const invoices: BillingInvoice[] = invoicesData || []

  // Get all plans
  const { data: plansData } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .eq('is_public', true)
    .order('display_order')

  const plans: SubscriptionPlan[] = plansData || []

  const isAdmin = profile.role === 'owner' || profile.role === 'admin' || profile.role === 'tenant_owner'

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
