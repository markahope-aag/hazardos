import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReportingService } from '@/lib/services/reporting-service'
import { reportTypeConfig, dateRangePresets } from '@/types/reporting'
import type { ReportType, ReportConfig, DateRangeType } from '@/types/reporting'
import { ReportViewerLazy } from '@/components/reports/report-viewer-lazy'
import { logger, formatError } from '@/lib/utils/logger'

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
    logger.error(
      { 
        error: formatError(error, 'REPORT_LOAD_ERROR'),
        reportType: type
      },
      'Failed to load initial report data'
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{config.label} Report</h1>
        <p className="text-muted-foreground">{config.description}</p>
      </div>

      <ReportViewerLazy
        reportType={reportType}
        initialConfig={initialConfig}
        initialData={initialData as Record<string, unknown>[]}
        columns={config.defaultColumns}
      />
    </div>
  )
}
