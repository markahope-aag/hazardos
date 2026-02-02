'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatCurrencyFromCents } from '@/lib/utils'
import type { SubscriptionPlan, BillingCycle } from '@/types/billing'

interface PlanSelectorProps {
  plans: SubscriptionPlan[]
  currentPlanId?: string
}

export function PlanSelector({ plans, currentPlanId }: PlanSelectorProps) {
  const { toast } = useToast()
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSelectPlan(planSlug: string) {
    setLoading(planSlug)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_slug: planSlug,
          billing_cycle: billingCycle,
          success_url: `${window.location.origin}/settings/billing?success=true`,
          cancel_url: `${window.location.origin}/settings/billing?canceled=true`,
        }),
      })

      if (!response.ok) throw new Error('Failed to create checkout session')

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start checkout',
        variant: 'destructive',
      })
      setLoading(null)
    }
  }

  const yearlySavings = (plan: SubscriptionPlan) => {
    if (!plan.price_yearly) return 0
    const monthlyTotal = plan.price_monthly * 12
    return Math.round(((monthlyTotal - plan.price_yearly) / monthlyTotal) * 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Your Plan</CardTitle>
        <CardDescription>
          Select the plan that best fits your business needs
        </CardDescription>
        <div className="flex items-center gap-3 pt-2">
          <Label htmlFor="billing-cycle" className={cn(billingCycle === 'monthly' && 'font-medium')}>
            Monthly
          </Label>
          <Switch
            id="billing-cycle"
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
          />
          <Label htmlFor="billing-cycle" className={cn(billingCycle === 'yearly' && 'font-medium')}>
            Yearly
            <Badge variant="secondary" className="ml-2">Save up to 17%</Badge>
          </Label>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId
            const price = billingCycle === 'yearly' && plan.price_yearly
              ? plan.price_yearly / 12
              : plan.price_monthly
            const savings = yearlySavings(plan)

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative border rounded-lg p-5 transition-all',
                  plan.slug === 'pro' && 'border-primary ring-1 ring-primary',
                  isCurrent && 'bg-muted/50'
                )}
              >
                {plan.slug === 'pro' && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                )}

                <div className="mb-4">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">{formatCurrencyFromCents(price)}</span>
                  <span className="text-muted-foreground">/month</span>
                  {billingCycle === 'yearly' && savings > 0 && (
                    <p className="text-sm text-green-600">Save {savings}% with yearly billing</p>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-2 text-xs text-muted-foreground mb-4">
                  {plan.max_users && <p>{plan.max_users} users</p>}
                  {plan.max_jobs_per_month && <p>{plan.max_jobs_per_month} jobs/month</p>}
                  {plan.max_storage_gb && <p>{plan.max_storage_gb} GB storage</p>}
                  {!plan.max_users && <p>Unlimited users</p>}
                  {!plan.max_jobs_per_month && <p>Unlimited jobs</p>}
                </div>

                <Button
                  className="w-full"
                  variant={plan.slug === 'pro' ? 'default' : 'outline'}
                  disabled={isCurrent || loading === plan.slug}
                  onClick={() => handleSelectPlan(plan.slug)}
                >
                  {loading === plan.slug ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    'Select Plan'
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
