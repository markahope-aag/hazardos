import { createClient } from '@/lib/supabase/server'
import type {
  PlatformStats,
  OrganizationSummary,
  RevenueMetrics,
  PlanDistribution,
  GrowthMetrics,
  OrganizationFilters,
  PaginatedOrganizations,
} from '@/types/platform-admin'

export class PlatformAdminService {
  /**
   * Check if the current user is a platform admin
   */
  static async isPlatformAdmin(): Promise<boolean> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) return false

    const { data: org } = await supabase
      .from('organizations')
      .select('is_platform_admin')
      .eq('id', profile.organization_id)
      .single()

    return org?.is_platform_admin === true
  }

  /**
   * Get platform-wide statistics
   */
  static async getPlatformStats(): Promise<PlatformStats> {
    const supabase = await createClient()

    // Get organization counts by status
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, subscription_status')

    const totalOrganizations = orgs?.length ?? 0
    const activeSubscriptions = orgs?.filter(o => o.subscription_status === 'active').length ?? 0
    const trialingSubscriptions = orgs?.filter(o => o.subscription_status === 'trialing').length ?? 0
    const canceledSubscriptions = orgs?.filter(o => o.subscription_status === 'canceled').length ?? 0

    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Get total jobs
    const { count: totalJobs } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })

    // Calculate MRR from active subscriptions
    const { data: subscriptions } = await supabase
      .from('organization_subscriptions')
      .select(`
        billing_cycle,
        plan:subscription_plans(price_monthly, price_yearly)
      `)
      .in('status', ['active', 'trialing'])

    let monthlyRecurringRevenue = 0
    subscriptions?.forEach(sub => {
      const plan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan
      if (plan) {
        if (sub.billing_cycle === 'yearly' && plan.price_yearly) {
          monthlyRecurringRevenue += Math.round(plan.price_yearly / 12)
        } else {
          monthlyRecurringRevenue += plan.price_monthly
        }
      }
    })

    return {
      totalOrganizations,
      activeSubscriptions,
      trialingSubscriptions,
      canceledSubscriptions,
      totalUsers: totalUsers ?? 0,
      totalJobs: totalJobs ?? 0,
      monthlyRecurringRevenue,
      annualRecurringRevenue: monthlyRecurringRevenue * 12,
    }
  }

  /**
   * Get list of organizations with filters
   */
  static async getOrganizations(
    filters: OrganizationFilters = {}
  ): Promise<PaginatedOrganizations> {
    const supabase = await createClient()

    const {
      search,
      status,
      planSlug,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = filters

    // Build query
    let query = supabase
      .from('organizations')
      .select(`
        id,
        name,
        created_at,
        subscription_status,
        trial_ends_at,
        stripe_customer_id,
        subscription:organization_subscriptions(
          users_count,
          jobs_this_month,
          billing_cycle,
          plan:subscription_plans(name, slug, price_monthly, price_yearly)
        )
      `, { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (status) {
      query = query.eq('subscription_status', status)
    }

    // Apply sorting
    const sortColumn = sortBy === 'created_at' ? 'created_at' :
      sortBy === 'name' ? 'name' : 'created_at'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) throw error

    // Transform data
    const organizations: OrganizationSummary[] = (data || [])
      .map(org => {
        const sub = Array.isArray(org.subscription) ? org.subscription[0] : org.subscription
        const plan = sub?.plan ? (Array.isArray(sub.plan) ? sub.plan[0] : sub.plan) : null

        // Calculate MRR for this org
        let mrr = 0
        if (plan && ['active', 'trialing'].includes(org.subscription_status || '')) {
          if (sub?.billing_cycle === 'yearly' && plan.price_yearly) {
            mrr = Math.round(plan.price_yearly / 12)
          } else {
            mrr = plan.price_monthly
          }
        }

        return {
          id: org.id,
          name: org.name,
          createdAt: org.created_at,
          subscriptionStatus: org.subscription_status || 'none',
          planName: plan?.name || null,
          planSlug: plan?.slug || null,
          usersCount: sub?.users_count || 0,
          jobsThisMonth: sub?.jobs_this_month || 0,
          mrr,
          trialEndsAt: org.trial_ends_at,
          stripeCustomerId: org.stripe_customer_id,
        }
      })
      // Filter by plan if specified
      .filter(org => !planSlug || org.planSlug === planSlug)

    // Sort by computed fields if needed
    if (sortBy === 'users_count') {
      organizations.sort((a, b) =>
        sortOrder === 'asc' ? a.usersCount - b.usersCount : b.usersCount - a.usersCount
      )
    } else if (sortBy === 'jobs_this_month') {
      organizations.sort((a, b) =>
        sortOrder === 'asc' ? a.jobsThisMonth - b.jobsThisMonth : b.jobsThisMonth - a.jobsThisMonth
      )
    } else if (sortBy === 'mrr') {
      organizations.sort((a, b) =>
        sortOrder === 'asc' ? a.mrr - b.mrr : b.mrr - a.mrr
      )
    }

    return {
      data: organizations,
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    }
  }

  /**
   * Get revenue metrics
   */
  static async getRevenueMetrics(): Promise<RevenueMetrics> {
    const stats = await this.getPlatformStats()

    // For a real implementation, you'd calculate these from historical data
    // This is a simplified version
    return {
      currentMrr: stats.monthlyRecurringRevenue,
      previousMrr: Math.round(stats.monthlyRecurringRevenue * 0.95), // Placeholder
      mrrGrowth: Math.round(stats.monthlyRecurringRevenue * 0.05),
      mrrGrowthPercentage: 5.0, // Placeholder
      churnRate: 2.5, // Placeholder
      ltv: stats.monthlyRecurringRevenue * 24, // Placeholder: 24 month average
    }
  }

  /**
   * Get plan distribution
   */
  static async getPlanDistribution(): Promise<PlanDistribution[]> {
    const supabase = await createClient()

    const { data: subscriptions } = await supabase
      .from('organization_subscriptions')
      .select(`
        billing_cycle,
        status,
        plan:subscription_plans(name, slug, price_monthly, price_yearly)
      `)
      .in('status', ['active', 'trialing'])

    const planCounts: Record<string, { name: string; count: number; revenue: number }> = {}

    subscriptions?.forEach(sub => {
      const plan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan
      if (plan) {
        if (!planCounts[plan.slug]) {
          planCounts[plan.slug] = { name: plan.name, count: 0, revenue: 0 }
        }
        planCounts[plan.slug].count++

        // Add revenue
        if (sub.billing_cycle === 'yearly' && plan.price_yearly) {
          planCounts[plan.slug].revenue += Math.round(plan.price_yearly / 12)
        } else {
          planCounts[plan.slug].revenue += plan.price_monthly
        }
      }
    })

    const total = Object.values(planCounts).reduce((sum, p) => sum + p.count, 0)

    return Object.entries(planCounts).map(([slug, data]) => ({
      planSlug: slug,
      planName: data.name,
      count: data.count,
      percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
      revenue: data.revenue,
    }))
  }

  /**
   * Get growth metrics
   */
  static async getGrowthMetrics(): Promise<GrowthMetrics> {
    const supabase = await createClient()

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // New orgs this month
    const { count: newOrgsThisMonth } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisMonthStart.toISOString())

    // New orgs last month
    const { count: newOrgsLastMonth } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastMonthStart.toISOString())
      .lte('created_at', lastMonthEnd.toISOString())

    // New users this month
    const { count: newUsersThisMonth } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisMonthStart.toISOString())

    // New users last month
    const { count: newUsersLastMonth } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastMonthStart.toISOString())
      .lte('created_at', lastMonthEnd.toISOString())

    // Churns this month (canceled subscriptions)
    const { count: churnsThisMonth } = await supabase
      .from('organization_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'canceled')
      .gte('canceled_at', thisMonthStart.toISOString())

    // Churns last month
    const { count: churnsLastMonth } = await supabase
      .from('organization_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'canceled')
      .gte('canceled_at', lastMonthStart.toISOString())
      .lte('canceled_at', lastMonthEnd.toISOString())

    return {
      newOrgsThisMonth: newOrgsThisMonth ?? 0,
      newOrgsLastMonth: newOrgsLastMonth ?? 0,
      newUsersThisMonth: newUsersThisMonth ?? 0,
      newUsersLastMonth: newUsersLastMonth ?? 0,
      churnsThisMonth: churnsThisMonth ?? 0,
      churnsLastMonth: churnsLastMonth ?? 0,
    }
  }

  /**
   * Get a single organization by ID
   */
  static async getOrganization(id: string): Promise<OrganizationSummary | null> {
    const supabase = await createClient()

    const { data: org, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        created_at,
        subscription_status,
        trial_ends_at,
        stripe_customer_id,
        subscription:organization_subscriptions(
          users_count,
          jobs_this_month,
          billing_cycle,
          plan:subscription_plans(name, slug, price_monthly, price_yearly)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !org) return null

    const sub = Array.isArray(org.subscription) ? org.subscription[0] : org.subscription
    const plan = sub?.plan ? (Array.isArray(sub.plan) ? sub.plan[0] : sub.plan) : null

    let mrr = 0
    if (plan && ['active', 'trialing'].includes(org.subscription_status || '')) {
      if (sub?.billing_cycle === 'yearly' && plan.price_yearly) {
        mrr = Math.round(plan.price_yearly / 12)
      } else {
        mrr = plan.price_monthly
      }
    }

    return {
      id: org.id,
      name: org.name,
      createdAt: org.created_at,
      subscriptionStatus: org.subscription_status || 'none',
      planName: plan?.name || null,
      planSlug: plan?.slug || null,
      usersCount: sub?.users_count || 0,
      jobsThisMonth: sub?.jobs_this_month || 0,
      mrr,
      trialEndsAt: org.trial_ends_at,
      stripeCustomerId: org.stripe_customer_id,
    }
  }
}
