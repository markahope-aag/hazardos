import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/server-auth'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import type {
  CommissionPlan,
  CommissionEarning,
  CommissionSummary,
  CreateCommissionPlanInput,
  CommissionStatus,
} from '@/types/sales'

export class CommissionService {
  // ========== PLANS ==========

  static async getPlans(): Promise<CommissionPlan[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('commission_plans')
      .select('id, organization_id, name, commission_type, base_rate, tiers, applies_to, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('name')

    if (error) throwDbError(error, 'fetch commission plans')
    return (data || []) as CommissionPlan[]
  }

  static async getPlan(id: string): Promise<CommissionPlan | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('commission_plans')
      .select('id, organization_id, name, commission_type, base_rate, tiers, applies_to, is_active, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throwDbError(error, 'fetch commission plan')
    return data as CommissionPlan | null
  }

  static async createPlan(input: CreateCommissionPlanInput): Promise<CommissionPlan> {
    const supabase = await createClient()

    const user = await getCurrentUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('commission_plans')
      .insert({
        organization_id: profile.organization_id,
        name: input.name,
        commission_type: input.commission_type,
        base_rate: input.base_rate || null,
        tiers: input.tiers || null,
        applies_to: input.applies_to || 'won',
      })
      .select()
      .single()

    if (error) throwDbError(error, 'create commission plan')

    await Activity.created('commission_plan', data.id, input.name)

    return data as CommissionPlan
  }

  static async updatePlan(id: string, updates: Partial<CreateCommissionPlanInput>): Promise<CommissionPlan> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('commission_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throwDbError(error, 'update commission plan')
    return data as CommissionPlan
  }

  static async deactivatePlan(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('commission_plans')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throwDbError(error, 'update commission plan')
  }

  // ========== EARNINGS ==========

  static async getEarnings(filters?: {
    user_id?: string
    status?: CommissionStatus
    pay_period?: string
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }): Promise<{ earnings: CommissionEarning[]; total: number; limit: number; offset: number }> {
    const supabase = await createClient()

    const limit = filters?.limit || 50
    const offset = filters?.offset || 0

    let query = supabase
      .from('commission_earnings')
      .select(`
        *,
        user:profiles!commission_earnings_user_id_fkey(id, full_name),
        plan:commission_plans(*)
      `, { count: 'exact' })
      .order('earning_date', { ascending: false })

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.pay_period) {
      query = query.eq('pay_period', filters.pay_period)
    }
    if (filters?.start_date) {
      query = query.gte('earning_date', filters.start_date)
    }
    if (filters?.end_date) {
      query = query.lte('earning_date', filters.end_date)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throwDbError(error, 'fetch commission earnings')

    const earnings = (data || []).map(e => ({
      ...e,
      user: Array.isArray(e.user) ? e.user[0] : e.user,
      plan: Array.isArray(e.plan) ? e.plan[0] : e.plan,
    })) as CommissionEarning[]

    return { earnings, total: count || 0, limit, offset }
  }

  static async createEarning(input: {
    user_id: string
    plan_id: string
    opportunity_id?: string
    job_id?: string
    invoice_id?: string
    base_amount: number
  }): Promise<CommissionEarning> {
    const supabase = await createClient()

    const user = await getCurrentUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new SecureError('UNAUTHORIZED')

    // Get the plan to calculate commission
    const plan = await this.getPlan(input.plan_id)
    if (!plan) throw new SecureError('NOT_FOUND', 'Commission plan not found')

    const { rate: commissionRate, amount: commissionAmount } = this.calcCommission(plan, input.base_amount)

    const { data, error } = await supabase
      .from('commission_earnings')
      .insert({
        organization_id: profile.organization_id,
        user_id: input.user_id,
        plan_id: input.plan_id,
        opportunity_id: input.opportunity_id || null,
        job_id: input.job_id || null,
        invoice_id: input.invoice_id || null,
        base_amount: input.base_amount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        status: 'pending',
        earning_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) throwDbError(error, 'create commission earning')
    return data as CommissionEarning
  }

  // Shared commission math for both manual createEarning and the
  // auto-create-on-won-job hook, so the two never drift.
  private static calcCommission(
    plan: CommissionPlan,
    baseAmount: number,
  ): { rate: number; amount: number } {
    if (plan.commission_type === 'percentage') {
      const rate = plan.base_rate || 0
      return { rate, amount: baseAmount * (rate / 100) }
    }
    if (plan.commission_type === 'flat') {
      // Flat plans pay a fixed amount regardless of deal size; rate is
      // stored as 100 only so the earnings table shows something sensible.
      return { rate: 100, amount: plan.base_rate || 0 }
    }
    if (plan.commission_type === 'tiered' && plan.tiers) {
      const tier = plan.tiers.find(
        (t) => baseAmount >= t.min && (t.max === null || baseAmount <= t.max),
      )
      if (tier) return { rate: tier.rate, amount: baseAmount * (tier.rate / 100) }
    }
    return { rate: 0, amount: 0 }
  }

  // CO2: called when a job is marked completed. Creates a single pending
  // commission earning for the responsible sales rep. Idempotent (guards on
  // an existing earning for the job) and best-effort — returns null instead
  // of throwing whenever a precondition isn't met (no rep, no plan, no
  // amount) so it can't block job completion.
  static async createEarningForJob(jobId: string): Promise<CommissionEarning | null> {
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('commission_earnings')
      .select('id')
      .eq('job_id', jobId)
      .maybeSingle()
    if (existing) return null

    const { data: job } = await supabase
      .from('jobs')
      .select('id, organization_id, opportunity_id, assigned_to, created_by, final_amount, actual_revenue, contract_amount, estimated_revenue')
      .eq('id', jobId)
      .single()
    if (!job) return null

    // Resolve the sales rep: prefer the opportunity owner (the person who
    // actually sold it), then the job's assignee, then its creator.
    let repId: string | null = job.assigned_to || job.created_by || null
    if (job.opportunity_id) {
      const { data: opp } = await supabase
        .from('opportunities')
        .select('owner_id')
        .eq('id', job.opportunity_id)
        .single()
      if (opp?.owner_id) repId = opp.owner_id
    }
    if (!repId) return null

    const { data: rep } = await supabase
      .from('profiles')
      .select('commission_plan_id')
      .eq('id', repId)
      .single()
    if (!rep?.commission_plan_id) return null

    const plan = await this.getPlan(rep.commission_plan_id)
    if (!plan || !plan.is_active) return null

    const baseAmount =
      job.final_amount ?? job.actual_revenue ?? job.contract_amount ?? job.estimated_revenue ?? 0
    if (!baseAmount || baseAmount <= 0) return null

    const { rate, amount } = this.calcCommission(plan, baseAmount)
    if (amount <= 0) return null

    const { data, error } = await supabase
      .from('commission_earnings')
      .insert({
        organization_id: job.organization_id,
        user_id: repId,
        plan_id: plan.id,
        opportunity_id: job.opportunity_id || null,
        job_id: job.id,
        base_amount: baseAmount,
        commission_rate: rate,
        commission_amount: amount,
        status: 'pending',
        earning_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) throwDbError(error, 'create commission earning for job')
    return data as CommissionEarning
  }

  static async approveEarning(id: string): Promise<CommissionEarning> {
    const supabase = await createClient()

    const user = await getCurrentUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('commission_earnings')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throwDbError(error, 'update commission earning')
    return data as CommissionEarning
  }

  static async rejectEarning(id: string, reason?: string): Promise<CommissionEarning> {
    const supabase = await createClient()

    const user = await getCurrentUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('commission_earnings')
      .update({
        status: 'rejected',
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throwDbError(error, 'reject commission earning')
    return data as CommissionEarning
  }

  static async markPaid(id: string): Promise<CommissionEarning> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('commission_earnings')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throwDbError(error, 'update commission earning')
    return data as CommissionEarning
  }

  static async bulkMarkPaid(ids: string[]): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('commission_earnings')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .in('id', ids)
      .eq('status', 'approved')

    if (error) throwDbError(error, 'update commission earnings')
  }

  // ========== SUMMARY ==========

  static async getSummary(userId?: string): Promise<CommissionSummary> {
    const supabase = await createClient()

    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const thisQuarter = Math.floor(now.getMonth() / 3)
    const quarterStart = new Date(now.getFullYear(), thisQuarter * 3, 1)
    const quarterStartStr = quarterStart.toISOString().split('T')[0]

    // Build base query filter
    const baseFilter = userId ? { user_id: userId } : {}

    // Run all queries in parallel for better performance
    const [pendingResult, approvedResult, paidResult, thisMonthResult, thisQuarterResult] = await Promise.all([
      // Total pending
      supabase
        .from('commission_earnings')
        .select('commission_amount')
        .match({ ...baseFilter, status: 'pending' }),
      // Total approved
      supabase
        .from('commission_earnings')
        .select('commission_amount')
        .match({ ...baseFilter, status: 'approved' }),
      // Total paid
      supabase
        .from('commission_earnings')
        .select('commission_amount')
        .match({ ...baseFilter, status: 'paid' }),
      // This month (all statuses)
      supabase
        .from('commission_earnings')
        .select('commission_amount')
        .match(baseFilter)
        .gte('earning_date', `${thisMonth}-01`)
        .lt('earning_date', `${thisMonth}-32`),
      // This quarter (all statuses)
      supabase
        .from('commission_earnings')
        .select('commission_amount')
        .match(baseFilter)
        .gte('earning_date', quarterStartStr),
    ])

    // Sum amounts for each category
    const sumAmounts = (data: { commission_amount: number }[] | null) =>
      (data || []).reduce((sum, e) => sum + (e.commission_amount || 0), 0)

    return {
      total_pending: sumAmounts(pendingResult.data),
      total_approved: sumAmounts(approvedResult.data),
      total_paid: sumAmounts(paidResult.data),
      this_month: sumAmounts(thisMonthResult.data),
      this_quarter: sumAmounts(thisQuarterResult.data),
    }
  }

  // ========== PERIODS (CO6) ==========

  // Lists every month that has commission earnings, annotated with its
  // open/closed state and roll-up totals. Months are derived from
  // earning_date so a period shows up as soon as it has any earning, even
  // before it's ever been closed.
  static async getPeriods(): Promise<Array<{
    period: string
    status: 'open' | 'closed'
    earning_count: number
    total_commission: number
    closed_at: string | null
  }>> {
    const supabase = await createClient()

    const [{ data: earnings }, { data: periods }] = await Promise.all([
      supabase.from('commission_earnings').select('earning_date, commission_amount'),
      supabase.from('commission_periods').select('period, status, closed_at'),
    ])

    const closedMap = new Map(
      (periods || []).map((p) => [p.period, { status: p.status as 'open' | 'closed', closed_at: p.closed_at }]),
    )

    const byMonth = new Map<string, { count: number; total: number }>()
    for (const e of earnings || []) {
      const month = (e.earning_date || '').slice(0, 7)
      if (!month) continue
      const agg = byMonth.get(month) || { count: 0, total: 0 }
      agg.count += 1
      agg.total += e.commission_amount || 0
      byMonth.set(month, agg)
    }

    // Include closed periods even if they have no earnings, so a period
    // can't silently disappear from the list after being closed.
    for (const period of closedMap.keys()) {
      if (!byMonth.has(period)) byMonth.set(period, { count: 0, total: 0 })
    }

    return Array.from(byMonth.entries())
      .map(([period, agg]) => ({
        period,
        status: closedMap.get(period)?.status ?? 'open',
        earning_count: agg.count,
        total_commission: agg.total,
        closed_at: closedMap.get(period)?.closed_at ?? null,
      }))
      .sort((a, b) => b.period.localeCompare(a.period))
  }

  static async setPeriodStatus(period: string, status: 'open' | 'closed'): Promise<void> {
    const supabase = await createClient()

    const user = await getCurrentUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new SecureError('UNAUTHORIZED')

    const { error } = await supabase
      .from('commission_periods')
      .upsert(
        {
          organization_id: profile.organization_id,
          period,
          status,
          closed_by: status === 'closed' ? user.id : null,
          closed_at: status === 'closed' ? new Date().toISOString() : null,
        },
        { onConflict: 'organization_id,period' },
      )

    if (error) throwDbError(error, 'update commission period')
  }

  // ========== USER ASSIGNMENTS ==========

  static async assignPlanToUser(userId: string, planId: string): Promise<void> {
    const supabase = await createClient()

    const user = await getCurrentUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new SecureError('UNAUTHORIZED')

    // profiles.commission_plan_id is the rep's active plan, read by the
    // auto-create-on-won-job hook (CO2). The column was added in
    // 20260713000004; before that this update silently no-op'd.
    const { error } = await supabase
      .from('profiles')
      .update({ commission_plan_id: planId })
      .eq('id', userId)

    if (error) throwDbError(error, 'update profile')
  }
}
