'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CreditCard, Loader2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import type { OrganizationSubscription } from '@/types/billing'
import { subscriptionStatusConfig } from '@/types/billing'

interface SubscriptionCardProps {
  subscription: OrganizationSubscription | null
  isAdmin: boolean
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function SubscriptionCard({ subscription, isAdmin }: SubscriptionCardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleManageBilling() {
    setLoading(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_url: window.location.href,
        }),
      })

      if (!response.ok) throw new Error('Failed to open billing portal')

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open billing portal',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>
            Choose a plan below to get started
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const statusConfig = subscriptionStatusConfig[subscription.status]
  const plan = subscription.plan

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {plan?.name || 'Unknown'} Plan
              <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.label}
              </Badge>
            </CardTitle>
            <CardDescription>
              {plan ? formatCurrency(plan.price_monthly) : '$0'}/month
              {subscription.billing_cycle === 'yearly' && ' (billed annually)'}
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={handleManageBilling} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Billing
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {subscription.current_period_end && (
            <div>
              <p className="text-muted-foreground">Current Period Ends</p>
              <p className="font-medium">
                {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
              </p>
            </div>
          )}

          {subscription.trial_end && subscription.status === 'trialing' && (
            <div>
              <p className="text-muted-foreground">Trial Ends</p>
              <p className="font-medium">
                {format(new Date(subscription.trial_end), 'MMM d, yyyy')}
              </p>
            </div>
          )}

          {subscription.cancel_at_period_end && (
            <div className="col-span-2">
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Subscription will cancel at end of billing period
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Usage */}
        {plan && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-3">Usage This Month</p>
            <div className="space-y-3">
              {plan.max_users && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Users</span>
                    <span>{subscription.users_count} / {plan.max_users}</span>
                  </div>
                  <Progress value={(subscription.users_count / plan.max_users) * 100} className="h-2" />
                </div>
              )}
              {plan.max_jobs_per_month && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Jobs</span>
                    <span>{subscription.jobs_this_month} / {plan.max_jobs_per_month}</span>
                  </div>
                  <Progress value={(subscription.jobs_this_month / plan.max_jobs_per_month) * 100} className="h-2" />
                </div>
              )}
              {plan.max_storage_gb && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Storage</span>
                    <span>{(subscription.storage_used_mb / 1024).toFixed(1)} GB / {plan.max_storage_gb} GB</span>
                  </div>
                  <Progress value={(subscription.storage_used_mb / 1024 / plan.max_storage_gb) * 100} className="h-2" />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
