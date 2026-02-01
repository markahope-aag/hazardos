import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import type {
  SubscriptionPlan,
  OrganizationSubscription,
  BillingInvoice,
  BillingCycle,
} from '@/types/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
})

export class StripeService {
  // ========== CUSTOMERS ==========

  static async getOrCreateCustomer(organizationId: string): Promise<string> {
    const supabase = await createClient()

    // Check if org already has Stripe customer
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id, name')
      .eq('id', organizationId)
      .single()

    if (org?.stripe_customer_id) {
      return org.stripe_customer_id
    }

    // Get org owner email
    const { data: owner } = await supabase
      .from('profiles')
      .select('email')
      .eq('organization_id', organizationId)
      .eq('role', 'owner')
      .maybeSingle()

    // Create Stripe customer
    const customer = await stripe.customers.create({
      name: org?.name || undefined,
      email: owner?.email || undefined,
      metadata: {
        organization_id: organizationId,
      },
    })

    // Save to org
    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customer.id })
      .eq('id', organizationId)

    return customer.id
  }

  // ========== CHECKOUT ==========

  static async createCheckoutSession(
    organizationId: string,
    planSlug: string,
    billingCycle: BillingCycle,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const supabase = await createClient()
    const customerId = await this.getOrCreateCustomer(organizationId)

    // Get plan
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', planSlug)
      .single()

    if (!plan) throw new Error('Plan not found')

    const priceId = billingCycle === 'yearly'
      ? plan.stripe_price_id_yearly
      : plan.stripe_price_id_monthly

    if (!priceId) throw new Error('Plan not configured in Stripe')

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          organization_id: organizationId,
          plan_id: plan.id,
        },
      },
      allow_promotion_codes: true,
    })

    return session.url!
  }

  // ========== BILLING PORTAL ==========

  static async createBillingPortalSession(
    organizationId: string,
    returnUrl: string
  ): Promise<string> {
    const supabase = await createClient()

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single()

    if (!org?.stripe_customer_id) {
      throw new Error('No billing account found')
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    })

    return session.url
  }

  // ========== SUBSCRIPTIONS ==========

  static async getSubscription(organizationId: string): Promise<OrganizationSubscription | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('organization_id', organizationId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async cancelSubscription(
    organizationId: string,
    reason?: string,
    cancelImmediately: boolean = false
  ): Promise<void> {
    const supabase = await createClient()

    const { data: sub } = await supabase
      .from('organization_subscriptions')
      .select('stripe_subscription_id')
      .eq('organization_id', organizationId)
      .single()

    if (!sub?.stripe_subscription_id) {
      throw new Error('No active subscription')
    }

    if (cancelImmediately) {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id)
    } else {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      })
    }

    await supabase
      .from('organization_subscriptions')
      .update({
        cancel_at_period_end: !cancelImmediately,
        canceled_at: cancelImmediately ? new Date().toISOString() : null,
        cancellation_reason: reason,
        status: cancelImmediately ? 'canceled' : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
  }

  static async reactivateSubscription(organizationId: string): Promise<void> {
    const supabase = await createClient()

    const { data: sub } = await supabase
      .from('organization_subscriptions')
      .select('stripe_subscription_id')
      .eq('organization_id', organizationId)
      .single()

    if (!sub?.stripe_subscription_id) {
      throw new Error('No subscription found')
    }

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    })

    await supabase
      .from('organization_subscriptions')
      .update({
        cancel_at_period_end: false,
        canceled_at: null,
        cancellation_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
  }

  // ========== INVOICES ==========

  static async getInvoices(organizationId: string): Promise<BillingInvoice[]> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('billing_invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .order('invoice_date', { ascending: false })

    return data || []
  }

  // ========== PLANS ==========

  static async getPlans(): Promise<SubscriptionPlan[]> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .eq('is_public', true)
      .order('display_order')

    return data || []
  }

  // ========== WEBHOOK HANDLING ==========

  static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    const supabase = await createClient()

    // Check if already processed (idempotency)
    const { data: existing } = await supabase
      .from('stripe_webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single()

    if (existing) return // Already processed

    // Record event
    await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event.data.object as Record<string, unknown>,
    })

    // Handle event
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
    }
  }

  private static async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const organizationId = session.metadata?.organization_id
    if (!organizationId) return

    // Subscription will be created via subscription.created webhook
    console.log(`Checkout completed for org ${organizationId}`)
  }

  private static async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const supabase = await createClient()
    const organizationId = subscription.metadata?.organization_id
    if (!organizationId) return

    const planId = subscription.metadata?.plan_id

    await supabase
      .from('organization_subscriptions')
      .upsert({
        organization_id: organizationId,
        plan_id: planId,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        status: subscription.status as string,
        billing_cycle: subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id',
      })

    // Update org status
    await supabase
      .from('organizations')
      .update({
        subscription_status: subscription.status,
        trial_ends_at: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
      })
      .eq('id', organizationId)
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const supabase = await createClient()
    const organizationId = subscription.metadata?.organization_id
    if (!organizationId) return

    await supabase
      .from('organization_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    await supabase
      .from('organizations')
      .update({ subscription_status: 'canceled' })
      .eq('id', organizationId)
  }

  private static async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const supabase = await createClient()
    const customerId = invoice.customer as string

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!org) return

    await supabase.from('billing_invoices').upsert({
      organization_id: org.id,
      stripe_invoice_id: invoice.id,
      invoice_number: invoice.number,
      status: 'paid',
      subtotal: invoice.subtotal,
      tax: invoice.tax || 0,
      total: invoice.total,
      amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due,
      invoice_date: new Date(invoice.created * 1000).toISOString(),
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      paid_at: new Date().toISOString(),
      invoice_pdf_url: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
    }, {
      onConflict: 'stripe_invoice_id',
    })
  }

  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const supabase = await createClient()
    const customerId = invoice.customer as string

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!org) return

    // Update org status
    await supabase
      .from('organizations')
      .update({ subscription_status: 'past_due' })
      .eq('id', org.id)

    // TODO: Send payment failed notification
  }
}
