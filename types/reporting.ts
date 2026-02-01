export type ReportType = 'sales' | 'jobs' | 'leads' | 'revenue' | 'custom'
export type DateRangeType =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom'
export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'none'
export type ExportFormat = 'xlsx' | 'csv' | 'pdf'
export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in'
export type ColumnFormat = 'currency' | 'percent' | 'number' | 'date' | 'text'
export type GroupInterval = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface DateRange {
  type: DateRangeType
  start?: string
  end?: string
}

export interface ReportFilter {
  field: string
  operator: FilterOperator
  value: unknown
}

export interface ReportColumn {
  field: string
  label: string
  visible: boolean
  format?: ColumnFormat
}

export interface ReportGrouping {
  field: string
  interval?: GroupInterval
}

export interface ReportConfig {
  date_range: DateRange
  filters: ReportFilter[]
  grouping?: ReportGrouping
  metrics: string[]
  columns: ReportColumn[]
  chart_type: ChartType
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface SavedReport {
  id: string
  organization_id: string
  created_by: string
  name: string
  description: string | null
  report_type: ReportType
  config: ReportConfig
  is_shared: boolean
  schedule_enabled: boolean
  schedule_frequency: string | null
  schedule_recipients: string[] | null
  last_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface ReportExport {
  id: string
  organization_id: string
  report_id: string | null
  exported_by: string
  report_name: string
  export_format: ExportFormat
  file_path: string | null
  file_size: number | null
  parameters: Record<string, unknown> | null
  created_at: string
}

// Report data rows
export interface SalesPerformanceRow {
  organization_id: string
  user_id: string
  full_name: string
  month: string
  proposals_sent: number
  proposals_won: number
  proposals_lost: number
  revenue_won: number
  avg_deal_size: number
  win_rate: number
}

export interface JobCostRow {
  organization_id: string
  job_id: string
  job_number: string
  title: string
  customer_name: string
  hazard_types: string[]
  month: string
  estimated_total: number
  actual_labor: number
  actual_materials: number
  actual_total: number
  invoiced: number
  collected: number
  variance: number
  variance_pct: number
}

export interface LeadSourceRow {
  organization_id: string
  source: string
  month: string
  leads: number
  converted: number
  total_revenue: number
  conversion_rate: number
  avg_revenue_per_conversion: number
}

// Input types
export interface CreateReportInput {
  name: string
  description?: string
  report_type: ReportType
  config: ReportConfig
  is_shared?: boolean
}

export interface UpdateReportInput {
  name?: string
  description?: string
  config?: ReportConfig
  is_shared?: boolean
  schedule_enabled?: boolean
  schedule_frequency?: string
  schedule_recipients?: string[]
}

export interface RunReportInput {
  config: ReportConfig
}

export interface ExportReportInput {
  format: ExportFormat
  title: string
  data: Record<string, unknown>[]
  columns: ReportColumn[]
}

// Report summary for dashboard
export interface ReportSummary {
  id: string
  name: string
  report_type: ReportType
  is_shared: boolean
  updated_at: string
  last_run_at?: string
}

// Date range presets with labels
export const dateRangePresets: { value: DateRangeType; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
]

// Report type configurations
export const reportTypeConfig: Record<ReportType, {
  label: string
  description: string
  defaultColumns: ReportColumn[]
  defaultMetrics: string[]
}> = {
  sales: {
    label: 'Sales Performance',
    description: 'Track sales rep performance and win rates',
    defaultColumns: [
      { field: 'full_name', label: 'Sales Rep', visible: true },
      { field: 'proposals_sent', label: 'Proposals Sent', visible: true, format: 'number' },
      { field: 'proposals_won', label: 'Won', visible: true, format: 'number' },
      { field: 'proposals_lost', label: 'Lost', visible: true, format: 'number' },
      { field: 'revenue_won', label: 'Revenue', visible: true, format: 'currency' },
      { field: 'win_rate', label: 'Win Rate', visible: true, format: 'percent' },
    ],
    defaultMetrics: ['proposals_sent', 'proposals_won', 'revenue_won', 'win_rate'],
  },
  jobs: {
    label: 'Job Costs',
    description: 'Analyze job cost variance and profitability',
    defaultColumns: [
      { field: 'job_number', label: 'Job #', visible: true },
      { field: 'title', label: 'Title', visible: true },
      { field: 'customer_name', label: 'Customer', visible: true },
      { field: 'estimated_total', label: 'Estimated', visible: true, format: 'currency' },
      { field: 'actual_total', label: 'Actual', visible: true, format: 'currency' },
      { field: 'variance', label: 'Variance', visible: true, format: 'currency' },
      { field: 'variance_pct', label: 'Variance %', visible: true, format: 'percent' },
    ],
    defaultMetrics: ['estimated_total', 'actual_total', 'variance'],
  },
  leads: {
    label: 'Lead Source ROI',
    description: 'Measure marketing channel effectiveness',
    defaultColumns: [
      { field: 'source', label: 'Source', visible: true },
      { field: 'leads', label: 'Leads', visible: true, format: 'number' },
      { field: 'converted', label: 'Converted', visible: true, format: 'number' },
      { field: 'conversion_rate', label: 'Conv. Rate', visible: true, format: 'percent' },
      { field: 'total_revenue', label: 'Revenue', visible: true, format: 'currency' },
      { field: 'avg_revenue_per_conversion', label: 'Avg. Revenue', visible: true, format: 'currency' },
    ],
    defaultMetrics: ['leads', 'converted', 'total_revenue', 'conversion_rate'],
  },
  revenue: {
    label: 'Revenue',
    description: 'Track revenue trends and forecasts',
    defaultColumns: [
      { field: 'month', label: 'Month', visible: true, format: 'date' },
      { field: 'invoiced', label: 'Invoiced', visible: true, format: 'currency' },
      { field: 'collected', label: 'Collected', visible: true, format: 'currency' },
    ],
    defaultMetrics: ['invoiced', 'collected'],
  },
  custom: {
    label: 'Custom',
    description: 'Build your own report',
    defaultColumns: [],
    defaultMetrics: [],
  },
}
