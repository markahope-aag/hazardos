import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlatformAdminService } from '@/lib/services/platform-admin-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Briefcase,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { OrganizationsTable } from '@/components/platform/organizations-table'
import type { PlatformStats, GrowthMetrics, PlanDistribution } from '@/types/platform-admin'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

function GrowthIndicator({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous
  const percentage = previous > 0 ? Math.round((diff / previous) * 100) : 0
  const isPositive = diff >= 0

  return (
    <div className={`flex items-center text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? (
        <ArrowUpRight className="h-3 w-3 mr-0.5" />
      ) : (
        <ArrowDownRight className="h-3 w-3 mr-0.5" />
      )}
      <span>{Math.abs(percentage)}% vs last month</span>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  growth?: { current: number; previous: number }
}

function StatsCard({ title, value, description, icon: Icon, growth }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {growth && <GrowthIndicator current={growth.current} previous={growth.previous} />}
        {description && !growth && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface PlanDistributionBarProps {
  distribution: PlanDistribution[]
}

function PlanDistributionBar({ distribution }: PlanDistributionBarProps) {
  const colors: Record<string, string> = {
    starter: 'bg-blue-500',
    pro: 'bg-primary',
    enterprise: 'bg-purple-500',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Plan Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
          {distribution.map((plan) => (
            <div
              key={plan.planSlug}
              className={`${colors[plan.planSlug] || 'bg-gray-400'}`}
              style={{ width: `${plan.percentage}%` }}
              title={`${plan.planName}: ${plan.count} (${plan.percentage}%)`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {distribution.map((plan) => (
            <div key={plan.planSlug} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colors[plan.planSlug] || 'bg-gray-400'}`} />
              <span className="text-sm">
                {plan.planName}: {plan.count} ({plan.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function PlatformDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isAdmin = await PlatformAdminService.isPlatformAdmin()
  if (!isAdmin) redirect('/dashboard')

  // Fetch all data in parallel
  const [stats, growth, planDistribution, orgsResult] = await Promise.all([
    PlatformAdminService.getPlatformStats(),
    PlatformAdminService.getGrowthMetrics(),
    PlatformAdminService.getPlanDistribution(),
    PlatformAdminService.getOrganizations({ limit: 10, sortBy: 'created_at', sortOrder: 'desc' }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your SaaS metrics and manage customers
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          Platform Admin
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(stats.monthlyRecurringRevenue)}
          icon={DollarSign}
          description={`${formatCurrency(stats.annualRecurringRevenue)} ARR`}
        />
        <StatsCard
          title="Total Organizations"
          value={formatNumber(stats.totalOrganizations)}
          icon={Building2}
          growth={{ current: growth.newOrgsThisMonth, previous: growth.newOrgsLastMonth }}
        />
        <StatsCard
          title="Active Subscriptions"
          value={formatNumber(stats.activeSubscriptions)}
          icon={Activity}
          description={`${stats.trialingSubscriptions} trialing`}
        />
        <StatsCard
          title="Total Users"
          value={formatNumber(stats.totalUsers)}
          icon={Users}
          growth={{ current: growth.newUsersThisMonth, previous: growth.newUsersLastMonth }}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Jobs"
          value={formatNumber(stats.totalJobs)}
          icon={Briefcase}
        />
        <StatsCard
          title="New This Month"
          value={formatNumber(growth.newOrgsThisMonth)}
          icon={TrendingUp}
          description={`${growth.newUsersThisMonth} new users`}
        />
        <StatsCard
          title="Churns This Month"
          value={formatNumber(growth.churnsThisMonth)}
          icon={ArrowDownRight}
          description={growth.churnsLastMonth > 0 ? `${growth.churnsLastMonth} last month` : 'No churns last month'}
        />
      </div>

      {/* Plan Distribution */}
      {planDistribution.length > 0 && (
        <PlanDistributionBar distribution={planDistribution} />
      )}

      {/* Recent Organizations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Organizations</CardTitle>
          <CardDescription>
            The 10 most recently created organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationsTable
            organizations={orgsResult.data}
            showPagination={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
