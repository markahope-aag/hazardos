import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-123' } } }),
    },
  }),
}))

// Mock PlatformAdminService
vi.mock('@/lib/services/platform-admin-service', () => ({
  PlatformAdminService: {
    isPlatformAdmin: () => Promise.resolve(true),
    getPlatformStats: () => Promise.resolve({
      monthlyRecurringRevenue: 500000, // $5,000 in cents
      annualRecurringRevenue: 6000000, // $60,000 in cents
      totalOrganizations: 25,
      activeSubscriptions: 22,
      trialingSubscriptions: 3,
      totalUsers: 150,
      totalJobs: 500,
    }),
    getGrowthMetrics: () => Promise.resolve({
      newOrgsThisMonth: 5,
      newOrgsLastMonth: 3,
      newUsersThisMonth: 20,
      newUsersLastMonth: 15,
      churnsThisMonth: 1,
      churnsLastMonth: 0,
    }),
    getPlanDistribution: () => Promise.resolve([
      { planSlug: 'starter', planName: 'Starter', count: 10, percentage: 40 },
      { planSlug: 'pro', planName: 'Pro', count: 12, percentage: 48 },
      { planSlug: 'enterprise', planName: 'Enterprise', count: 3, percentage: 12 },
    ]),
    getOrganizations: () => Promise.resolve({
      data: [
        { id: 'org-1', name: 'Acme Corp', plan: 'pro', status: 'active' },
        { id: 'org-2', name: 'Tech Inc', plan: 'starter', status: 'active' },
      ],
      total: 2,
    }),
  },
}))

// Mock OrganizationsTable component
vi.mock('@/components/platform/organizations-table', () => ({
  OrganizationsTable: ({ organizations }: { organizations: unknown[] }) => (
    <div data-testid="organizations-table">
      Organizations: {Array.isArray(organizations) ? organizations.length : 0}
    </div>
  ),
}))

// Import after mocks
import PlatformDashboardPage from '@/app/(dashboard)/platform/page'

describe('PlatformDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await PlatformDashboardPage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await PlatformDashboardPage()
    render(page)

    expect(screen.getByText('Platform Dashboard')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await PlatformDashboardPage()
    render(page)

    expect(screen.getByText('Monitor your SaaS metrics and manage customers')).toBeInTheDocument()
  })

  it('displays Platform Admin badge', async () => {
    const page = await PlatformDashboardPage()
    render(page)

    expect(screen.getByText('Platform Admin')).toBeInTheDocument()
  })

  it('displays MRR stat card', async () => {
    const page = await PlatformDashboardPage()
    render(page)

    expect(screen.getByText('Monthly Recurring Revenue')).toBeInTheDocument()
  })

  it('displays organizations stat card', async () => {
    const page = await PlatformDashboardPage()
    render(page)

    expect(screen.getByText('Total Organizations')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('displays active subscriptions stat card', async () => {
    const page = await PlatformDashboardPage()
    render(page)

    expect(screen.getByText('Active Subscriptions')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
    expect(screen.getByText('3 trialing')).toBeInTheDocument()
  })

  it('displays total users stat card', async () => {
    const page = await PlatformDashboardPage()
    render(page)

    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('displays total jobs stat card', async () => {
    const page = await PlatformDashboardPage()
    render(page)

    expect(screen.getByText('Total Jobs')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  it('displays plan distribution', async () => {
    const page = await PlatformDashboardPage()
    render(page)

    expect(screen.getByText('Plan Distribution')).toBeInTheDocument()
    expect(screen.getByText(/Starter: 10/)).toBeInTheDocument()
    expect(screen.getByText(/Pro: 12/)).toBeInTheDocument()
    expect(screen.getByText(/Enterprise: 3/)).toBeInTheDocument()
  })

  it('displays recent organizations section', async () => {
    const page = await PlatformDashboardPage()
    render(page)

    expect(screen.getByText('Recent Organizations')).toBeInTheDocument()
    expect(screen.getByText('The 10 most recently created organizations')).toBeInTheDocument()
  })

  it('renders organizations table', async () => {
    const page = await PlatformDashboardPage()
    render(page)

    expect(screen.getByTestId('organizations-table')).toBeInTheDocument()
    expect(screen.getByText('Organizations: 2')).toBeInTheDocument()
  })

  it('displays growth indicators', async () => {
    const page = await PlatformDashboardPage()
    render(page)

    // Should show growth comparisons
    expect(screen.getByText(/vs last month/)).toBeInTheDocument()
  })
})
