import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
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

    if (error) throw error
    return (data || []) as CommissionPlan[]
  }

  static async getPlan(id: string): Promise<CommissionPlan | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('commission_plans')
      .select('id, organization_id, name, commission_type, base_rate, tiers, applies_to, is_active, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as CommissionPlan | null
  }

  static async createPlan(input: CreateCommissionPlanInput): Promise<CommissionPlan> {
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

    if (error) throw error

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

    if (error) throw error
    return data as CommissionPlan
  }

  static async deactivatePlan(id: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('commission_plans')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error
  }

  // ========== EARNINGS ==========

  static async getEarnings(filters?: {
    user_id?: string
    status?: CommissionStatus
    pay_period?: string
    start_date?: string
    end_date?: string
  }): Promise<CommissionEarning[]> {
    const supabase = await createClient()

    let query = supabase
      .from('commission_earnings')
      .select(`
        *,
        user:profiles(id, full_name),
        plan:commission_plans(*)
      `)
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

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(e => ({
      ...e,
      user: Array.isArray(e.user) ? e.user[0] : e.user,
      plan: Array.isArray(e.plan) ? e.plan[0] : e.plan,
    })) as CommissionEarning[]
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    // Get the plan to calculate commission
    const plan = await this.getPlan(input.plan_id)
    if (!plan) throw new Error('Commission plan not found')

    // Calculate commission based on plan type
    let commissionRate = 0
    let commissionAmount = 0

    if (plan.commission_type === 'percentage') {
      commissionRate = plan.base_rate || 0
      commissionAmount = input.base_amount * (commissionRate / 100)
    } else if (plan.commission_type === 'flat') {
      commissionRate = 100 // Flat rate
      commissionAmount = plan.base_rate || 0
    } else if (plan.commission_type === 'tiered' && plan.tiers) {
      // Find applicable tier
      const tier = plan.tiers.find(
        t => input.base_amount >= t.min && (t.max === null || input.base_amount <= t.max)
      )
      if (tier) {
        commissionRate = tier.rate
        commissionAmount = input.base_amount * (tier.rate / 100)
      }
    }

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

    if (error) throw error
    return data as CommissionEarning
  }

  static async approveEarning(id: string): Promise<CommissionEarning> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

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

    if (error) throw error
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

    if (error) throw error
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

    if (error) throw error
  }

  // ========== SUMMARY ==========

  static async getSummary(userId?: string): Promise<CommissionSummary> {
    const supabase = await createClient()

    let query = supabase
      .from('commission_earnings')
      .select('status, commission_amount, earning_date')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) throw error

    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const thisQuarter = Math.floor(now.getMonth() / 3)
    const quarterStart = new Date(now.getFullYear(), thisQuarter * 3, 1)

    const earnings = data || []

    const summary: CommissionSummary = {
      total_pending: 0,
      total_approved: 0,
      total_paid: 0,
      this_month: 0,
      this_quarter: 0,
    }

    earnings.forEach(e => {
      const amount = e.commission_amount || 0

      switch (e.status) {
        case 'pending':
          summary.total_pending += amount
          break
        case 'approved':
          summary.total_approved += amount
          break
        case 'paid':
          summary.total_paid += amount
          break
      }

      // This month
      if (e.earning_date?.startsWith(thisMonth)) {
        summary.this_month += amount
      }

      // This quarter
      const earningDate = new Date(e.earning_date)
      if (earningDate >= quarterStart) {
        summary.this_quarter += amount
      }
    })

    return summary
  }

  // ========== USER ASSIGNMENTS ==========

  static async assignPlanToUser(userId: string, planId: string): Promise<void> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    // Check if user_commission_plans table exists, if not use profile update
    const { error } = await supabase
      .from('profiles')
      .update({ commission_plan_id: planId })
      .eq('id', userId)

    if (error) throw error
  }
}
