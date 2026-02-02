'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Loading skeleton for charts
function ChartSkeleton({ title, height = '300px' }: { title?: string; height?: string }) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div style={{ height }} className="flex items-center justify-center">
          <div className="space-y-3 w-full">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex space-x-2 pt-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Lazy load all recharts components to reduce bundle size
export const BarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" /> }
)

export const Bar = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Bar })),
  { ssr: false }
)

export const LineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" /> }
)

export const Line = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Line })),
  { ssr: false }
)

export const PieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" /> }
)

export const Pie = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Pie })),
  { ssr: false }
)

export const XAxis = dynamic(
  () => import('recharts').then(mod => ({ default: mod.XAxis })),
  { ssr: false }
)

export const YAxis = dynamic(
  () => import('recharts').then(mod => ({ default: mod.YAxis })),
  { ssr: false }
)

export const CartesianGrid = dynamic(
  () => import('recharts').then(mod => ({ default: mod.CartesianGrid })),
  { ssr: false }
)

export const Tooltip = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Tooltip })),
  { ssr: false }
)

export const Legend = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Legend })),
  { ssr: false }
)

export const ResponsiveContainer = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
  { ssr: false }
)

export const Cell = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Cell })),
  { ssr: false }
)

// Higher-level lazy chart components with proper loading states
export const LazyBarChart = dynamic(
  () => import('@/components/charts/bar-chart-wrapper'),
  { 
    ssr: false, 
    loading: () => <ChartSkeleton title="Loading Chart..." height="300px" /> 
  }
)

export const LazyLineChart = dynamic(
  () => import('@/components/charts/line-chart-wrapper'),
  { 
    ssr: false, 
    loading: () => <ChartSkeleton title="Loading Chart..." height="300px" /> 
  }
)

export const LazyPieChart = dynamic(
  () => import('@/components/charts/pie-chart-wrapper'),
  { 
    ssr: false, 
    loading: () => <ChartSkeleton title="Loading Chart..." height="300px" /> 
  }
)

export { ChartSkeleton }