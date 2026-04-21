import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { StatsCards, StatsCardsErrorBoundary } from '@/components/dashboard/stats-cards';
import { UpcomingJobs, UpcomingJobsErrorBoundary } from '@/components/dashboard/upcoming-jobs';
import { OverdueInvoices, OverdueInvoicesErrorBoundary } from '@/components/dashboard/overdue-invoices';
import { RecentActivity, RecentActivityErrorBoundary } from '@/components/dashboard/recent-activity';
import { RevenueChart, JobsByStatus, LeadSourceChart, JobsByHazard } from '@/components/dashboard/charts-lazy';
import { DashboardFiltersBar } from '@/components/dashboard/dashboard-filters';
import { parseDashboardFilters } from '@/lib/dashboard/filters';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const filters = parseDashboardFilters(resolvedSearchParams);

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

      {/* Filters */}
      <DashboardFiltersBar filters={filters} />

      {/* Key Metrics */}
      <StatsCardsErrorBoundary>
        <Suspense fallback={<StatsCardsSkeleton />} key={`${filters.period}-${filters.hazardType}`}>
          <StatsCards filters={filters} />
        </Suspense>
      </StatsCardsErrorBoundary>

      {/* Upcoming Jobs — promoted out of the bottom details row. What the
          crew is doing next is one of the two most useful things to see
          on a dashboard, alongside the revenue stat just above. */}
      <UpcomingJobsErrorBoundary>
        <Suspense fallback={<WidgetSkeleton />}>
          <UpcomingJobs />
        </Suspense>
      </UpcomingJobsErrorBoundary>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <JobsByStatus filters={filters} />
      </div>

      {/* Hazard breakdown — click a slice to filter the rest of the dashboard */}
      <JobsByHazard filters={filters} />

      {/* Lead sources */}
      <LeadSourceChart filters={filters} />

      {/* Secondary row: what needs money in, what happened recently */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    </div>
  );
}
