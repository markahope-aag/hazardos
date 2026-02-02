import { createClient } from '@/lib/supabase/server'
import type {
  FeatureFlag,
  UsageLimits,
  UsageStats,
  UsageWarning,
  UsageWarningLevel,
} from '@/types/feature-flags'
import { usageWarningThresholds } from '@/types/feature-flags'

export class FeatureFlagsService {
  /**
   * Check if a feature is enabled for the current organization
   */
  static async isFeatureEnabled(featureKey: FeatureFlag): Promise<boolean> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) return false

    return this.isFeatureEnabledForOrg(profile.organization_id, featureKey)
  }

  /**
   * Check if a feature is enabled for a specific organization
   */
  static async isFeatureEnabledForOrg(
    organizationId: string,
    featureKey: FeatureFlag
  ): Promise<boolean> {
    const supabase = await createClient()

    // Get the organization's subscription with plan details
    const { data: subscription } = await supabase
      .from('organization_subscriptions')
      .select(`
        status,
        plan:subscription_plans(feature_flags)
      `)
      .eq('organization_id', organizationId)
      .single()

    if (!subscription) return false

    // Check if subscription is active (or trialing)
    const activeStatuses = ['active', 'trialing']
    if (!activeStatuses.includes(subscription.status)) return false

    // Get feature flags from plan
    const plan = Array.isArray(subscription.plan) ? subscription.plan[0] : subscription.plan
    const featureFlags = plan?.feature_flags as Record<string, boolean> | null

    if (!featureFlags) return false

    return featureFlags[featureKey] === true
  }

  /**
   * Get all feature flags for the current organization
   */
  static async getFeatureFlags(): Promise<Record<FeatureFlag, boolean>> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return this.getDefaultFlags()

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) return this.getDefaultFlags()

    return this.getFeatureFlagsForOrg(profile.organization_id)
  }

  /**
   * Get all feature flags for a specific organization
   */
  static async getFeatureFlagsForOrg(
    organizationId: string
  ): Promise<Record<FeatureFlag, boolean>> {
    const supabase = await createClient()

    const { data: subscription } = await supabase
      .from('organization_subscriptions')
      .select(`
        status,
        plan:subscription_plans(feature_flags)
      `)
      .eq('organization_id', organizationId)
      .single()

    if (!subscription) return this.getDefaultFlags()

    const activeStatuses = ['active', 'trialing']
    if (!activeStatuses.includes(subscription.status)) return this.getDefaultFlags()

    const plan = Array.isArray(subscription.plan) ? subscription.plan[0] : subscription.plan
    const featureFlags = plan?.feature_flags as Record<string, boolean> | null

    if (!featureFlags) return this.getDefaultFlags()

    return {
      quickbooks: featureFlags.quickbooks ?? false,
      api_access: featureFlags.api_access ?? false,
      custom_branding: featureFlags.custom_branding ?? false,
      advanced_reporting: featureFlags.advanced_reporting ?? false,
      priority_support: featureFlags.priority_support ?? false,
      unlimited_users: !featureFlags.max_users,
      unlimited_jobs: !featureFlags.max_jobs_per_month,
    }
  }

  /**
   * Get usage limits for the current organization
   */
  static async getUsageLimits(): Promise<UsageLimits> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return this.getDefaultLimits()

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) return this.getDefaultLimits()

    return this.getUsageLimitsForOrg(profile.organization_id)
  }

  /**
   * Get usage limits for a specific organization
   */
  static async getUsageLimitsForOrg(organizationId: string): Promise<UsageLimits> {
    const supabase = await createClient()

    const { data: subscription } = await supabase
      .from('organization_subscriptions')
      .select(`
        plan:subscription_plans(max_users, max_jobs_per_month, max_storage_gb)
      `)
      .eq('organization_id', organizationId)
      .single()

    if (!subscription) return this.getDefaultLimits()

    const plan = Array.isArray(subscription.plan) ? subscription.plan[0] : subscription.plan

    return {
      maxUsers: plan?.max_users ?? null,
      maxJobsPerMonth: plan?.max_jobs_per_month ?? null,
      maxStorageGb: plan?.max_storage_gb ?? null,
    }
  }

  /**
   * Get current usage stats for an organization
   */
  static async getUsageStats(organizationId: string): Promise<UsageStats> {
    const supabase = await createClient()

    const { data: subscription } = await supabase
      .from('organization_subscriptions')
      .select('users_count, jobs_this_month, storage_used_mb')
      .eq('organization_id', organizationId)
      .single()

    return {
      usersCount: subscription?.users_count ?? 0,
      jobsThisMonth: subscription?.jobs_this_month ?? 0,
      storageUsedMb: subscription?.storage_used_mb ?? 0,
    }
  }

  /**
   * Check usage and return any warnings
   */
  static async checkUsageWarnings(organizationId: string): Promise<UsageWarning[]> {
    const [limits, stats] = await Promise.all([
      this.getUsageLimitsForOrg(organizationId),
      this.getUsageStats(organizationId),
    ])

    const warnings: UsageWarning[] = []

    // Check users
    if (limits.maxUsers !== null) {
      const percentage = stats.usersCount / limits.maxUsers
      const level = this.getWarningLevel(percentage)
      if (level !== 'none') {
        warnings.push({
          type: 'users',
          level,
          current: stats.usersCount,
          limit: limits.maxUsers,
          percentage: percentage * 100,
          message: this.getWarningMessage('users', level, stats.usersCount, limits.maxUsers),
        })
      }
    }

    // Check jobs
    if (limits.maxJobsPerMonth !== null) {
      const percentage = stats.jobsThisMonth / limits.maxJobsPerMonth
      const level = this.getWarningLevel(percentage)
      if (level !== 'none') {
        warnings.push({
          type: 'jobs',
          level,
          current: stats.jobsThisMonth,
          limit: limits.maxJobsPerMonth,
          percentage: percentage * 100,
          message: this.getWarningMessage('jobs', level, stats.jobsThisMonth, limits.maxJobsPerMonth),
        })
      }
    }

    // Check storage
    if (limits.maxStorageGb !== null) {
      const usedGb = stats.storageUsedMb / 1024
      const percentage = usedGb / limits.maxStorageGb
      const level = this.getWarningLevel(percentage)
      if (level !== 'none') {
        warnings.push({
          type: 'storage',
          level,
          current: Math.round(usedGb * 10) / 10,
          limit: limits.maxStorageGb,
          percentage: percentage * 100,
          message: this.getWarningMessage('storage', level, usedGb, limits.maxStorageGb),
        })
      }
    }

    return warnings
  }

  /**
   * Check if organization can add more users
   */
  static async canAddUser(organizationId: string): Promise<boolean> {
    const [limits, stats] = await Promise.all([
      this.getUsageLimitsForOrg(organizationId),
      this.getUsageStats(organizationId),
    ])

    if (limits.maxUsers === null) return true
    return stats.usersCount < limits.maxUsers
  }

  /**
   * Check if organization can create more jobs this month
   */
  static async canCreateJob(organizationId: string): Promise<boolean> {
    const [limits, stats] = await Promise.all([
      this.getUsageLimitsForOrg(organizationId),
      this.getUsageStats(organizationId),
    ])

    if (limits.maxJobsPerMonth === null) return true
    return stats.jobsThisMonth < limits.maxJobsPerMonth
  }

  // Private helpers

  private static getDefaultFlags(): Record<FeatureFlag, boolean> {
    return {
      quickbooks: false,
      api_access: false,
      custom_branding: false,
      advanced_reporting: false,
      priority_support: false,
      unlimited_users: false,
      unlimited_jobs: false,
    }
  }

  private static getDefaultLimits(): UsageLimits {
    return {
      maxUsers: 3,
      maxJobsPerMonth: 50,
      maxStorageGb: 5,
    }
  }

  private static getWarningLevel(percentage: number): UsageWarningLevel {
    if (percentage >= 1) return 'exceeded'
    if (percentage >= usageWarningThresholds.critical) return 'critical'
    if (percentage >= usageWarningThresholds.warning) return 'warning'
    return 'none'
  }

  private static getWarningMessage(
    type: 'users' | 'jobs' | 'storage',
    level: UsageWarningLevel,
    current: number,
    limit: number
  ): string {
    const typeLabels = {
      users: 'users',
      jobs: 'jobs this month',
      storage: 'GB of storage',
    }

    if (level === 'exceeded') {
      return `You've reached your limit of ${limit} ${typeLabels[type]}. Upgrade your plan to continue.`
    }

    if (level === 'critical') {
      return `You're almost at your limit: ${current} of ${limit} ${typeLabels[type]} used.`
    }

    return `You're approaching your limit: ${current} of ${limit} ${typeLabels[type]} used.`
  }
}
