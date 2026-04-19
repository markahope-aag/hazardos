'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ChartErrorBoundary } from '@/components/error-boundaries'
import type { DashboardFilters } from '@/lib/dashboard/filters'

// Loading component for charts
function ChartLoadingState({ title: _title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 bg-muted rounded animate-pulse w-40" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </CardContent>
    </Card>
  )
}

// Lazy load heavy chart components (recharts ~200KB)
const RevenueChartInner = dynamic(
  () => import('@/components/dashboard/revenue-chart').then(mod => ({ default: mod.RevenueChart })),
  {
    ssr: false,
    loading: () => <ChartLoadingState title="Revenue" />,
  }
)

const JobsByStatusInner = dynamic(
  () => import('@/components/dashboard/jobs-by-status').then(mod => ({ default: mod.JobsByStatus })),
  {
    ssr: false,
    loading: () => <ChartLoadingState title="Jobs" />,
  }
)

const LeadSourceChartInner = dynamic(
  () => import('@/components/dashboard/lead-source-chart').then(mod => ({ default: mod.LeadSourceChart })),
  {
    ssr: false,
    loading: () => <ChartLoadingState title="Lead Sources" />,
  }
)

const JobsByHazardInner = dynamic(
  () => import('@/components/dashboard/jobs-by-hazard').then(mod => ({ default: mod.JobsByHazard })),
  {
    ssr: false,
    loading: () => <ChartLoadingState title="Jobs by Hazard" />,
  }
)

// Wrapped versions with error boundaries
export function RevenueChart() {
  return (
    <ChartErrorBoundary title="Revenue (Last 6 Months)" height="300px">
      <RevenueChartInner />
    </ChartErrorBoundary>
  )
}

export function JobsByStatus({ filters }: { filters: DashboardFilters }) {
  return (
    <ChartErrorBoundary title="Jobs by Status" height="300px">
      <JobsByStatusInner filters={filters} />
    </ChartErrorBoundary>
  )
}

export function LeadSourceChart({ filters }: { filters: DashboardFilters }) {
  return (
    <ChartErrorBoundary title="Lead Sources" height="200px">
      <LeadSourceChartInner filters={filters} />
    </ChartErrorBoundary>
  )
}

export function JobsByHazard({ filters }: { filters: DashboardFilters }) {
  return (
    <ChartErrorBoundary title="Jobs by Hazard" height="280px">
      <JobsByHazardInner filters={filters} />
    </ChartErrorBoundary>
  )
}
