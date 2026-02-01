'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

// Lazy load heavy chart components (recharts ~200KB)
export const RevenueChart = dynamic(
  () => import('@/components/dashboard/revenue-chart').then(mod => ({ default: mod.RevenueChart })),
  {
    ssr: false,
    loading: () => (
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
    ),
  }
)

export const JobsByStatus = dynamic(
  () => import('@/components/dashboard/jobs-by-status').then(mod => ({ default: mod.JobsByStatus })),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <div className="h-5 bg-muted rounded animate-pulse w-32" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    ),
  }
)
