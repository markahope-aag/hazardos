import { redirect, notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import { ReportingService } from '@/lib/services/reporting-service'
import { reportTypeConfig, dateRangePresets } from '@/types/reporting'
import type { ReportType, ReportConfig, DateRangeType } from '@/types/reporting'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

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

interface Props {
  params: Promise<{ type: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ReportTypePage({ params, searchParams }: Props) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { type } = await params
  const search = await searchParams

  if (!['sales', 'jobs', 'leads', 'revenue'].includes(type)) {
    notFound()
  }

  const reportType = type as ReportType
  const config = reportTypeConfig[reportType]

  // Build initial config from search params or defaults
  const validDateRangeTypes = dateRangePresets.map(p => p.value)
  const rangeParam = search.range as string
  const dateRangeType: DateRangeType = validDateRangeTypes.includes(rangeParam as DateRangeType)
    ? (rangeParam as DateRangeType)
    : 'last_30_days'
  const initialConfig: ReportConfig = {
    date_range: {
      type: dateRangeType,
      start: search.start as string,
      end: search.end as string,
    },
    filters: [],
    metrics: config.defaultMetrics,
    columns: config.defaultColumns,
    chart_type: 'bar',
  }

  // Fetch initial data
  let initialData: unknown[] = []
  try {
    switch (reportType) {
      case 'sales':
        initialData = await ReportingService.runSalesReport(initialConfig)
        break
      case 'jobs':
        initialData = await ReportingService.runJobCostReport(initialConfig)
        break
      case 'leads':
        initialData = await ReportingService.runLeadSourceReport(initialConfig)
        break
    }
  } catch (error) {
    console.error('Failed to load initial report data:', error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{config.label} Report</h1>
        <p className="text-muted-foreground">{config.description}</p>
      </div>

      <ReportViewer
        reportType={reportType}
        initialConfig={initialConfig}
        initialData={initialData as Record<string, unknown>[]}
        columns={config.defaultColumns}
      />
    </div>
  )
}
