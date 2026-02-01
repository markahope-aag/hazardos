import { NextResponse } from 'next/server'
import { StripeService } from '@/lib/services/stripe-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { completeOnboardSchema } from '@/lib/validations/onboard'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * POST /api/onboard/complete
 * Complete onboarding by creating organization and setting up subscription
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: completeOnboardSchema,
  },
  async (request, context, body) => {
    const { organization, plan_id, billing_cycle, start_trial } = body

    // Check if user already has an organization
    const { data: existingProfile } = await context.supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', context.user.id)
      .single()

    if (existingProfile?.organization_id) {
      throw new SecureError('VALIDATION_ERROR', 'User already belongs to an organization')
    }

    // Get the selected plan
    const { data: plan } = await context.supabase
      .from('subscription_plans')
      .select('id, name, slug, description, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly, features, limits, is_active, is_public, display_order, created_at')
      .eq('id', plan_id)
      .single()

    if (!plan) {
      throw new SecureError('NOT_FOUND', 'Plan not found')
    }

    // Create the organization
    const { data: newOrg, error: orgError } = await context.supabase
      .from('organizations')
      .insert({
        name: organization.name,
        address: organization.address || null,
        city: organization.city || null,
        state: organization.state || null,
        zip: organization.zip || null,
        phone: organization.phone || null,
        email: organization.email || null,
        license_number: organization.licenseNumber || null,
        subscription_status: 'trialing',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      })
      .select()
      .single()

    if (orgError || !newOrg) {
      throw new SecureError('BAD_REQUEST', 'Failed to create organization')
    }

    // Update user's profile with organization
    const { error: profileError } = await context.supabase
      .from('profiles')
      .update({
        organization_id: newOrg.id,
        role: 'owner',
      })
      .eq('id', context.user.id)

    if (profileError) {
      // Rollback org creation
      await context.supabase.from('organizations').delete().eq('id', newOrg.id)
      throw new SecureError('BAD_REQUEST', 'Failed to update profile')
    }

    // Create subscription record
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    await context.supabase
      .from('organization_subscriptions')
      .insert({
        organization_id: newOrg.id,
        plan_id: plan.id,
        status: 'trialing',
        billing_cycle: billing_cycle,
        trial_start: new Date().toISOString(),
        trial_end: trialEnd.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: trialEnd.toISOString(),
        users_count: 1,
      })

    // If user wants to subscribe now (not just trial), create Stripe checkout
    if (!start_trial) {
      try {
        const checkoutUrl = await StripeService.createCheckoutSession(
          newOrg.id,
          plan.slug,
          billing_cycle,
          `${request.nextUrl.origin}/dashboard?subscription=success`,
          `${request.nextUrl.origin}/onboard?subscription=canceled`
        )

        return NextResponse.json({
          success: true,
          organizationId: newOrg.id,
          checkoutUrl
        })
      } catch (_stripeError) {
        // Stripe checkout failed, but org is created with trial
        return NextResponse.json({
          success: true,
          organizationId: newOrg.id,
          message: 'Organization created with trial. Stripe checkout unavailable.'
        })
      }
    }

    // Trial started, return success
    return NextResponse.json({
      success: true,
      organizationId: newOrg.id,
      message: 'Organization created with 14-day trial'
    })
  }
)
