'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { ReportType, ReportConfig, ReportColumn } from '@/types/reporting'

// Lazy load ReportViewer (contains recharts ~200KB)
const ReportViewer = dynamic(
  () => import('@/components/reports/report-viewer').then(mod => ({ default: mod.ReportViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-10 w-[180px] bg-muted rounded animate-pulse" />
              <div className="h-10 w-[140px] bg-muted rounded animate-pulse" />
              <div className="flex-1" />
              <div className="h-10 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-20 bg-muted rounded animate-pulse" />
              <div className="h-10 w-20 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  }
)

interface ReportViewerLazyProps {
  reportType: ReportType
  initialConfig: ReportConfig
  initialData: Record<string, unknown>[]
  columns: ReportColumn[]
}

export function ReportViewerLazy({
  reportType,
  initialConfig,
  initialData,
  columns,
}: ReportViewerLazyProps) {
  return (
    <ReportViewer
      reportType={reportType}
      initialConfig={initialConfig}
      initialData={initialData}
      columns={columns}
    />
  )
}
