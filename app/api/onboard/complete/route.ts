import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StripeService } from '@/lib/services/stripe-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

interface OrganizationData {
  name: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  email?: string
  licenseNumber?: string
}

interface OnboardRequest {
  organization: OrganizationData
  plan_id: string
  billing_cycle: 'monthly' | 'yearly'
  start_trial?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    // Check if user already has an organization
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (existingProfile?.organization_id) {
      throw new SecureError('VALIDATION_ERROR', 'User already belongs to an organization')
    }

    const body: OnboardRequest = await request.json()
    const { organization, plan_id, billing_cycle, start_trial } = body

    if (!organization?.name || !plan_id) {
      throw new SecureError('VALIDATION_ERROR', 'Organization name and plan are required')
    }

    // Get the selected plan
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single()

    if (!plan) {
      throw new SecureError('NOT_FOUND', 'Plan not found')
    }

    // Create the organization
    const { data: newOrg, error: orgError } = await supabase
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
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        organization_id: newOrg.id,
        role: 'owner',
      })
      .eq('id', user.id)

    if (profileError) {
      // Rollback org creation
      await supabase.from('organizations').delete().eq('id', newOrg.id)
      throw new SecureError('BAD_REQUEST', 'Failed to update profile')
    }

    // Create subscription record
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    const { error: subError } = await supabase
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

    if (subError) {
      // Log but don't fail - subscription can be created later
      console.error('Failed to create subscription record:', subError)
    }

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
      } catch (stripeError) {
        // Stripe checkout failed, but org is created with trial
        console.error('Stripe checkout error:', stripeError)
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
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
