'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { LogoVertical } from '@/components/ui/logo'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Check, Building2, CreditCard, Sparkles, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
import type { SubscriptionPlan } from '@/types/billing'

type OnboardingStep = 'organization' | 'plan' | 'complete'

interface OrganizationData {
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  licenseNumber: string
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export default function OnboardPage() {
  const [step, setStep] = useState<OnboardingStep>('organization')
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [orgData, setOrgData] = useState<OrganizationData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    licenseNumber: '',
  })

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Check authentication and existing organization
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Check if user already has an organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (profile?.organization_id) {
        router.push('/dashboard')
        return
      }

      // Fetch available plans
      const response = await fetch('/api/billing/plans')
      if (response.ok) {
        const plansData = await response.json()
        setPlans(plansData)
        // Default to pro plan
        const proPlan = plansData.find((p: SubscriptionPlan) => p.slug === 'pro')
        if (proPlan) setSelectedPlan(proPlan.id)
      }

      setCheckingAuth(false)
    }

    checkAuth()
  }, [supabase, router])

  const handleOrgInputChange = (field: keyof OrganizationData, value: string) => {
    setOrgData(prev => ({ ...prev, [field]: value }))
  }

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Organization name is required',
        variant: 'destructive',
      })
      return
    }
    setStep('plan')
  }

  const handlePlanSelect = async () => {
    if (!selectedPlan) {
      toast({
        title: 'Error',
        description: 'Please select a plan',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      // Create organization with selected plan
      const response = await fetch('/api/onboard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: orgData,
          plan_id: selectedPlan,
          billing_cycle: billingCycle,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create organization')
      }

      const { checkoutUrl } = await response.json()

      if (checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = checkoutUrl
      } else {
        // Trial started, go to dashboard
        setStep('complete')
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 2000)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStartTrial = async () => {
    if (!selectedPlan) return

    setLoading(true)

    try {
      const response = await fetch('/api/onboard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: orgData,
          plan_id: selectedPlan,
          billing_cycle: billingCycle,
          start_trial: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create organization')
      }

      toast({
        title: 'Welcome to HazardOS!',
        description: 'Your 14-day trial has started.',
      })

      setStep('complete')
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <LogoVertical size="xl" />
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Welcome to HazardOS</h1>
          <p className="text-gray-600 mt-2">
            Let&apos;s set up your organization in a few simple steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={cn(
              'flex items-center gap-2',
              step === 'organization' ? 'text-primary' : 'text-gray-400'
            )}>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step === 'organization' ? 'bg-primary text-white' : 'bg-green-500 text-white'
              )}>
                {step === 'organization' ? '1' : <Check className="h-4 w-4" />}
              </div>
              <span className="hidden sm:inline font-medium">Organization</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-200" />
            <div className={cn(
              'flex items-center gap-2',
              step === 'plan' ? 'text-primary' :
              step === 'complete' ? 'text-green-500' : 'text-gray-400'
            )}>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step === 'plan' ? 'bg-primary text-white' :
                step === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-200'
              )}>
                {step === 'complete' ? <Check className="h-4 w-4" /> : '2'}
              </div>
              <span className="hidden sm:inline font-medium">Plan</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-200" />
            <div className={cn(
              'flex items-center gap-2',
              step === 'complete' ? 'text-green-500' : 'text-gray-400'
            )}>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step === 'complete' ? 'bg-green-500 text-white' : 'bg-gray-200'
              )}>
                {step === 'complete' ? <Check className="h-4 w-4" /> : '3'}
              </div>
              <span className="hidden sm:inline font-medium">Complete</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        {step === 'organization' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Details
              </CardTitle>
              <CardDescription>
                Tell us about your environmental remediation company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOrgSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      value={orgData.name}
                      onChange={(e) => handleOrgInputChange('name', e.target.value)}
                      placeholder="Acme Environmental Services"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      value={orgData.licenseNumber}
                      onChange={(e) => handleOrgInputChange('licenseNumber', e.target.value)}
                      placeholder="ENV-2024-001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={orgData.phone}
                      onChange={(e) => handleOrgInputChange('phone', e.target.value)}
                      placeholder="(303) 555-0123"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={orgData.address}
                    onChange={(e) => handleOrgInputChange('address', e.target.value)}
                    placeholder="123 Business Street"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={orgData.city}
                      onChange={(e) => handleOrgInputChange('city', e.target.value)}
                      placeholder="Denver"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={orgData.state}
                      onChange={(e) => handleOrgInputChange('state', e.target.value)}
                      placeholder="CO"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      value={orgData.zip}
                      onChange={(e) => handleOrgInputChange('zip', e.target.value)}
                      placeholder="80202"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Company Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={orgData.email}
                    onChange={(e) => handleOrgInputChange('email', e.target.value)}
                    placeholder="info@company.com"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" size="lg">
                    Continue to Plan Selection
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'plan' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Choose Your Plan
              </CardTitle>
              <CardDescription>
                Start with a 14-day free trial. Cancel anytime.
              </CardDescription>
              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant={billingCycle === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </Button>
                <Button
                  variant={billingCycle === 'yearly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBillingCycle('yearly')}
                >
                  Yearly
                  <Badge variant="secondary" className="ml-2">Save 17%</Badge>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.id
                  const price = billingCycle === 'yearly' && plan.price_yearly
                    ? plan.price_yearly / 12
                    : plan.price_monthly

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={cn(
                        'relative border rounded-lg p-5 cursor-pointer transition-all',
                        plan.slug === 'pro' && 'border-primary',
                        isSelected && 'ring-2 ring-primary bg-primary/5'
                      )}
                    >
                      {plan.slug === 'pro' && (
                        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Recommended
                        </Badge>
                      )}

                      <div className="mb-4">
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>

                      <div className="mb-4">
                        <span className="text-3xl font-bold">{formatCurrency(price)}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>

                      <ul className="space-y-2 mb-4">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        {plan.max_users ? <p>{plan.max_users} users</p> : <p>Unlimited users</p>}
                        {plan.max_jobs_per_month ? <p>{plan.max_jobs_per_month} jobs/month</p> : <p>Unlimited jobs</p>}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="ghost" onClick={() => setStep('organization')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleStartTrial}
                    disabled={loading || !selectedPlan}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Start 14-Day Trial'
                    )}
                  </Button>
                  <Button
                    onClick={handlePlanSelect}
                    disabled={loading || !selectedPlan}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Subscribe Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'complete' && (
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  You&apos;re All Set!
                </h2>
                <p className="text-gray-600 mb-4">
                  Your organization has been created. Redirecting to your dashboard...
                </p>
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-primary hover:underline">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  )
}
