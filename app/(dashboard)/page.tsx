import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { StatsCards, StatsCardsErrorBoundary } from '@/components/dashboard/stats-cards';
import { UpcomingJobs, UpcomingJobsErrorBoundary } from '@/components/dashboard/upcoming-jobs';
import { OverdueInvoices, OverdueInvoicesErrorBoundary } from '@/components/dashboard/overdue-invoices';
import { RecentActivity, RecentActivityErrorBoundary } from '@/components/dashboard/recent-activity';
import { RevenueChart, JobsByStatus } from '@/components/dashboard/charts-lazy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Calendar, Users } from 'lucide-react';
import Link from 'next/link';

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 bg-muted rounded animate-pulse w-24" />
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-muted rounded animate-pulse w-20 mb-2" />
            <div className="h-3 bg-muted rounded animate-pulse w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 bg-muted rounded animate-pulse w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // If no user on server-side, render a minimal shell (client layout handles redirect)
  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
        <StatsCardsSkeleton />
      </div>
    );
  }

  // Single query with join to avoid N+1 (profile + organization)
  // Must disambiguate FK since profiles has two relationships to organizations
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      full_name,
      organization_id,
      role,
      organization:organizations!profiles_organization_id_fkey(name)
    `)
    .eq('id', user.id)
    .single();

  const organization = Array.isArray(profile?.organization)
    ? profile?.organization[0]
    : profile?.organization;

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const isPlatformOwner = profile?.role === 'platform_owner';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isPlatformOwner ? 'Platform Dashboard' : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {firstName}
          {organization?.name && ` - ${organization.name}`}
        </p>
        {isPlatformOwner && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Platform Owner:</strong> You have full access to all platform features.
            </p>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <StatsCardsErrorBoundary>
        <Suspense fallback={<StatsCardsSkeleton />}>
          <StatsCards />
        </Suspense>
      </StatsCardsErrorBoundary>

      {/* Charts Row - Lazy loaded (error boundaries built into chart components) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <JobsByStatus />
      </div>

      {/* Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UpcomingJobsErrorBoundary>
          <Suspense fallback={<WidgetSkeleton />}>
            <UpcomingJobs />
          </Suspense>
        </UpcomingJobsErrorBoundary>
        <OverdueInvoicesErrorBoundary>
          <Suspense fallback={<WidgetSkeleton />}>
            <OverdueInvoices />
          </Suspense>
        </OverdueInvoicesErrorBoundary>
        <RecentActivityErrorBoundary>
          <Suspense fallback={<WidgetSkeleton />}>
            <RecentActivity />
          </Suspense>
        </RecentActivityErrorBoundary>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/site-surveys/new">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                New Survey
              </Button>
            </Link>
            <Link href="/customers">
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Customers
              </Button>
            </Link>
            <Link href="/jobs/new">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Job
              </Button>
            </Link>
            <Link href="/invoices/new">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
