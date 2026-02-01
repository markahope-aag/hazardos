// Feature flag keys that can be gated by subscription plan
export type FeatureFlag =
  | 'quickbooks'
  | 'api_access'
  | 'custom_branding'
  | 'advanced_reporting'
  | 'priority_support'
  | 'unlimited_users'
  | 'unlimited_jobs'

// Feature flag configuration with display info
export interface FeatureFlagConfig {
  key: FeatureFlag
  name: string
  description: string
  requiredPlan: 'starter' | 'pro' | 'enterprise'
}

// All feature flags with their configurations
export const featureFlagConfigs: FeatureFlagConfig[] = [
  {
    key: 'quickbooks',
    name: 'QuickBooks Integration',
    description: 'Sync invoices and payments with QuickBooks',
    requiredPlan: 'pro',
  },
  {
    key: 'api_access',
    name: 'API Access',
    description: 'Access the HazardOS API for custom integrations',
    requiredPlan: 'enterprise',
  },
  {
    key: 'custom_branding',
    name: 'Custom Branding',
    description: 'Add your logo and colors to customer-facing documents',
    requiredPlan: 'pro',
  },
  {
    key: 'advanced_reporting',
    name: 'Advanced Reporting',
    description: 'Access detailed analytics and custom reports',
    requiredPlan: 'pro',
  },
  {
    key: 'priority_support',
    name: 'Priority Support',
    description: 'Get faster response times from our support team',
    requiredPlan: 'pro',
  },
  {
    key: 'unlimited_users',
    name: 'Unlimited Users',
    description: 'Add unlimited team members to your organization',
    requiredPlan: 'enterprise',
  },
  {
    key: 'unlimited_jobs',
    name: 'Unlimited Jobs',
    description: 'Create unlimited jobs per month',
    requiredPlan: 'enterprise',
  },
]

// Usage limits per plan
export interface UsageLimits {
  maxUsers: number | null // null = unlimited
  maxJobsPerMonth: number | null
  maxStorageGb: number | null
}

// Current usage stats
export interface UsageStats {
  usersCount: number
  jobsThisMonth: number
  storageUsedMb: number
}

// Usage warning thresholds
export const usageWarningThresholds = {
  warning: 0.8, // 80% - show warning
  critical: 0.95, // 95% - show critical warning
} as const

// Usage warning levels
export type UsageWarningLevel = 'none' | 'warning' | 'critical' | 'exceeded'

export interface UsageWarning {
  type: 'users' | 'jobs' | 'storage'
  level: UsageWarningLevel
  current: number
  limit: number
  percentage: number
  message: string
}
