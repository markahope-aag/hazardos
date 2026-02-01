import { createClient } from '@/lib/supabase/server'
import type {
  SavedReport,
  ReportConfig,
  DateRange,
  SalesPerformanceRow,
  JobCostRow,
  LeadSourceRow,
  CreateReportInput,
  UpdateReportInput,
} from '@/types/reporting'

export class ReportingService {
  // ========== DATE HELPERS ==========

  static getDateRange(dateRange: DateRange): { start: string; end: string } {
    const now = new Date()
    let start: Date
    let end: Date = now

    switch (dateRange.type) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59)
        break
      case 'last_7_days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last_30_days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        break
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        start = new Date(now.getFullYear(), quarter * 3, 1)
        break
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1)
        break
      case 'custom':
        start = dateRange.start ? new Date(dateRange.start) : new Date(now.getFullYear(), 0, 1)
        end = dateRange.end ? new Date(dateRange.end) : now
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return { start: start.toISOString(), end: end.toISOString() }
  }

  // ========== RUN REPORTS ==========

  static async runSalesReport(config: ReportConfig): Promise<SalesPerformanceRow[]> {
    const supabase = await createClient()
    const { start, end } = this.getDateRange(config.date_range)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    const { data, error } = await supabase
      .from('mv_sales_performance')
      .select('organization_id, month, total_proposals, proposals_won, proposals_lost, total_value, won_value, win_rate, avg_deal_size')
      .eq('organization_id', profile.organization_id)
      .gte('month', start)
      .lte('month', end)
      .order('month', { ascending: false })

    if (error) throw error
    return (data || []) as unknown as SalesPerformanceRow[]
  }

  static async runJobCostReport(config: ReportConfig): Promise<JobCostRow[]> {
    const supabase = await createClient()
    const { start, end } = this.getDateRange(config.date_range)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    const { data, error } = await supabase
      .from('mv_job_costs')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .gte('month', start)
      .lte('month', end)
      .order('month', { ascending: false })

    if (error) throw error
    return (data || []) as unknown as JobCostRow[]
  }

  static async runLeadSourceReport(config: ReportConfig): Promise<LeadSourceRow[]> {
    const supabase = await createClient()
    const { start, end } = this.getDateRange(config.date_range)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    const { data, error } = await supabase
      .from('mv_lead_source_roi')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .gte('month', start)
      .lte('month', end)
      .order('source')

    if (error) throw error
    return (data || []) as unknown as LeadSourceRow[]
  }

  // ========== SAVED REPORTS CRUD ==========

  static async listReports(): Promise<SavedReport[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('saved_reports')
      .select('id, organization_id, name, description, report_type, config, is_shared, schedule_enabled, schedule_frequency, schedule_recipients, created_by, created_at, updated_at')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return (data || []) as SavedReport[]
  }

  static async getReport(id: string): Promise<SavedReport | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('saved_reports')
      .select('id, organization_id, name, description, report_type, config, is_shared, schedule_enabled, schedule_frequency, schedule_recipients, created_by, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as SavedReport | null
  }

  static async createReport(input: CreateReportInput): Promise<SavedReport> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    const { data, error } = await supabase
      .from('saved_reports')
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        name: input.name,
        description: input.description || null,
        report_type: input.report_type,
        config: input.config,
        is_shared: input.is_shared ?? false,
      })
      .select()
      .single()

    if (error) throw error
    return data as SavedReport
  }

  static async updateReport(id: string, input: UpdateReportInput): Promise<SavedReport> {
    const supabase = await createClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.config !== undefined) updateData.config = input.config
    if (input.is_shared !== undefined) updateData.is_shared = input.is_shared
    if (input.schedule_enabled !== undefined) updateData.schedule_enabled = input.schedule_enabled
    if (input.schedule_frequency !== undefined) updateData.schedule_frequency = input.schedule_frequency
    if (input.schedule_recipients !== undefined) updateData.schedule_recipients = input.schedule_recipients

    const { data, error } = await supabase
      .from('saved_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as SavedReport
  }

  static async deleteReport(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('saved_reports')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== EXPORT TRACKING ==========

  static async recordExport(input: {
    report_id?: string
    report_name: string
    export_format: string
    file_size?: number
    parameters?: Record<string, unknown>
  }): Promise<void> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    await supabase.from('report_exports').insert({
      organization_id: profile.organization_id,
      exported_by: user.id,
      report_id: input.report_id || null,
      report_name: input.report_name,
      export_format: input.export_format,
      file_size: input.file_size || null,
      parameters: input.parameters || null,
    })
  }

  // ========== REFRESH VIEWS ==========

  static async refreshViews(): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.rpc('refresh_report_views')
    if (error) throw error
  }
}
