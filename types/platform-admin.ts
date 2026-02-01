// Platform-level statistics
export interface PlatformStats {
  totalOrganizations: number
  activeSubscriptions: number
  trialingSubscriptions: number
  canceledSubscriptions: number
  totalUsers: number
  totalJobs: number
  monthlyRecurringRevenue: number // MRR in cents
  annualRecurringRevenue: number // ARR in cents
}

// Organization summary for admin view
export interface OrganizationSummary {
  id: string
  name: string
  createdAt: string
  subscriptionStatus: string
  planName: string | null
  planSlug: string | null
  usersCount: number
  jobsThisMonth: number
  mrr: number // monthly revenue in cents
  trialEndsAt: string | null
  stripeCustomerId: string | null
}

// Revenue metrics
export interface RevenueMetrics {
  currentMrr: number
  previousMrr: number
  mrrGrowth: number
  mrrGrowthPercentage: number
  churnRate: number
  ltv: number // lifetime value
}

// Plan distribution
export interface PlanDistribution {
  planSlug: string
  planName: string
  count: number
  percentage: number
  revenue: number
}

// Growth metrics
export interface GrowthMetrics {
  newOrgsThisMonth: number
  newOrgsLastMonth: number
  newUsersThisMonth: number
  newUsersLastMonth: number
  churnsThisMonth: number
  churnsLastMonth: number
}

// Filters for organization list
export interface OrganizationFilters {
  search?: string
  status?: string
  planSlug?: string
  sortBy?: 'created_at' | 'name' | 'users_count' | 'jobs_this_month' | 'mrr'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// Paginated response
export interface PaginatedOrganizations {
  data: OrganizationSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}
