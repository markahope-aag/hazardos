import { render, screen, fireEvent } from '@testing-library/react'
import { OrganizationsTable } from '@/components/platform/organizations-table'
import type { OrganizationSummary } from '@/types/platform-admin'

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date | string, formatStr: string) => {
    const d = new Date(date)
    if (formatStr === 'MMM d, yyyy') {
      const month = d.toLocaleDateString('en-US', { month: 'short' })
      const day = d.getDate()
      const year = d.getFullYear()
      return `${month} ${day}, ${year}`
    }
    if (formatStr === 'MMM d') {
      const month = d.toLocaleDateString('en-US', { month: 'short' })
      const day = d.getDate()
      return `${month} ${day}`
    }
    return date.toString()
  },
}))

const mockOrganizations: OrganizationSummary[] = [
  {
    id: 'org_001',
    name: 'Acme Hazard Removal',
    createdAt: '2024-01-01T00:00:00Z',
    subscriptionStatus: 'active',
    planName: 'Professional',
    planSlug: 'pro',
    usersCount: 5,
    jobsThisMonth: 23,
    mrr: 9900, // $99.00
    trialEndsAt: null,
    stripeCustomerId: 'cus_123',
  },
  {
    id: 'org_002',
    name: 'SafeSpace Abatement',
    createdAt: '2024-01-15T00:00:00Z',
    subscriptionStatus: 'trialing',
    planName: 'Starter',
    planSlug: 'starter',
    usersCount: 2,
    jobsThisMonth: 5,
    mrr: 0,
    trialEndsAt: '2024-02-15T00:00:00Z',
    stripeCustomerId: null,
  },
  {
    id: 'org_003',
    name: 'CleanAir Services',
    createdAt: '2023-06-01T00:00:00Z',
    subscriptionStatus: 'past_due',
    planName: 'Enterprise',
    planSlug: 'enterprise',
    usersCount: 15,
    jobsThisMonth: 78,
    mrr: 29900, // $299.00
    trialEndsAt: null,
    stripeCustomerId: 'cus_456',
  },
  {
    id: 'org_004',
    name: 'EnviroSafe Inc',
    createdAt: '2023-12-01T00:00:00Z',
    subscriptionStatus: 'canceled',
    planName: null,
    planSlug: null,
    usersCount: 0,
    jobsThisMonth: 0,
    mrr: 0,
    trialEndsAt: null,
    stripeCustomerId: 'cus_789',
  },
]

describe('OrganizationsTable', () => {
  describe('basic rendering', () => {
    it('should render table with all organizations', () => {
      render(<OrganizationsTable organizations={mockOrganizations} />)

      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('Acme Hazard Removal')).toBeInTheDocument()
      expect(screen.getByText('SafeSpace Abatement')).toBeInTheDocument()
      expect(screen.getByText('CleanAir Services')).toBeInTheDocument()
      expect(screen.getByText('EnviroSafe Inc')).toBeInTheDocument()
    })

    it('should render table headers', () => {
      render(<OrganizationsTable organizations={mockOrganizations} />)

      expect(screen.getByText('Organization')).toBeInTheDocument()
      expect(screen.getByText('Plan')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('Jobs')).toBeInTheDocument()
      expect(screen.getByText('MRR')).toBeInTheDocument()
      expect(screen.getByText('Created')).toBeInTheDocument()
    })

    it('should render plan names', () => {
      render(<OrganizationsTable organizations={mockOrganizations} />)

      expect(screen.getByText('Professional')).toBeInTheDocument()
      expect(screen.getByText('Starter')).toBeInTheDocument()
      expect(screen.getByText('Enterprise')).toBeInTheDocument()
    })

    it('should render dash when no plan', () => {
      render(<OrganizationsTable organizations={mockOrganizations} />)

      // EnviroSafe Inc has no plan
      const rows = screen.getAllByRole('row')
      const enviroRow = rows.find(row => row.textContent?.includes('EnviroSafe Inc'))
      expect(enviroRow?.textContent).toMatch(/-/)
    })

    it('should render user counts', () => {
      render(<OrganizationsTable organizations={mockOrganizations} />)

      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('should render job counts', () => {
      render(<OrganizationsTable organizations={mockOrganizations} />)

      expect(screen.getByText('23')).toBeInTheDocument()
      expect(screen.getByText('78')).toBeInTheDocument()
    })

    it('should render MRR values', () => {
      render(<OrganizationsTable organizations={mockOrganizations} />)

      expect(screen.getByText('$99.00')).toBeInTheDocument()
      expect(screen.getByText('$299.00')).toBeInTheDocument()
    })

    it('should render dash for zero MRR', () => {
      render(<OrganizationsTable organizations={mockOrganizations} />)

      // SafeSpace Abatement and EnviroSafe Inc have 0 MRR
      const dashes = screen.getAllByText('-')
      expect(dashes.length).toBeGreaterThanOrEqual(2)
    })

    it('should render created dates', () => {
      render(<OrganizationsTable organizations={mockOrganizations} />)

      expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument()
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
      expect(screen.getByText('Jun 1, 2023')).toBeInTheDocument()
      expect(screen.getByText('Dec 1, 2023')).toBeInTheDocument()
    })

    it('should render external links to organization detail pages', () => {
      render(<OrganizationsTable organizations={mockOrganizations} />)

      const links = screen.getAllByRole('link')
      expect(links.find(link => link.getAttribute('href') === '/platform/organizations/org_001')).toBeInTheDocument()
      expect(links.find(link => link.getAttribute('href') === '/platform/organizations/org_002')).toBeInTheDocument()
    })
  })

  describe('status badges', () => {
    it('should render active status with correct styling', () => {
      render(<OrganizationsTable organizations={[mockOrganizations[0]]} />)

      const badge = screen.getByText('Active')
      expect(badge).toHaveClass('text-green-800', 'bg-green-100')
    })

    it('should render trialing status with correct styling', () => {
      render(<OrganizationsTable organizations={[mockOrganizations[1]]} />)

      const badge = screen.getByText('Trialing')
      expect(badge).toHaveClass('text-blue-800', 'bg-blue-100')
    })

    it('should render past_due status with correct styling', () => {
      render(<OrganizationsTable organizations={[mockOrganizations[2]]} />)

      const badge = screen.getByText('Past Due')
      expect(badge).toHaveClass('text-yellow-800', 'bg-yellow-100')
    })

    it('should render canceled status with correct styling', () => {
      render(<OrganizationsTable organizations={[mockOrganizations[3]]} />)

      const badge = screen.getByText('Canceled')
      expect(badge).toHaveClass('text-gray-800', 'bg-gray-100')
    })

    it('should handle unknown status', () => {
      const orgUnknownStatus: OrganizationSummary = {
        ...mockOrganizations[0],
        subscriptionStatus: 'unknown_status',
      }

      render(<OrganizationsTable organizations={[orgUnknownStatus]} />)

      // Should fall back to 'none' config
      expect(screen.getByText('No Plan')).toBeInTheDocument()
    })
  })

  describe('trial end date', () => {
    it('should show trial end date for trialing organizations', () => {
      render(<OrganizationsTable organizations={[mockOrganizations[1]]} />)

      expect(screen.getByText(/Trial ends Feb 14/)).toBeInTheDocument()
    })

    it('should not show trial end date for non-trialing organizations', () => {
      render(<OrganizationsTable organizations={[mockOrganizations[0]]} />)

      expect(screen.queryByText(/Trial ends/)).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should render empty state when no organizations', () => {
      render(<OrganizationsTable organizations={[]} />)

      expect(screen.getByText('No organizations found')).toBeInTheDocument()
    })
  })

  describe('search functionality', () => {
    it('should render search input when onSearch is provided', () => {
      const onSearch = vi.fn()
      render(<OrganizationsTable organizations={mockOrganizations} onSearch={onSearch} />)

      expect(screen.getByPlaceholderText('Search organizations...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
    })

    it('should not render search when onSearch is not provided', () => {
      render(<OrganizationsTable organizations={mockOrganizations} />)

      expect(screen.queryByPlaceholderText('Search organizations...')).not.toBeInTheDocument()
    })

    it('should call onSearch when search button is clicked', () => {
      const onSearch = vi.fn()
      render(<OrganizationsTable organizations={mockOrganizations} onSearch={onSearch} />)

      const input = screen.getByPlaceholderText('Search organizations...')
      fireEvent.change(input, { target: { value: 'Acme' } })
      fireEvent.click(screen.getByRole('button', { name: 'Search' }))

      expect(onSearch).toHaveBeenCalledWith('Acme')
    })

    it('should call onSearch when Enter is pressed', () => {
      const onSearch = vi.fn()
      render(<OrganizationsTable organizations={mockOrganizations} onSearch={onSearch} />)

      const input = screen.getByPlaceholderText('Search organizations...')
      fireEvent.change(input, { target: { value: 'Safe' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onSearch).toHaveBeenCalledWith('Safe')
    })

    it('should not call onSearch for other key presses', () => {
      const onSearch = vi.fn()
      render(<OrganizationsTable organizations={mockOrganizations} onSearch={onSearch} />)

      const input = screen.getByPlaceholderText('Search organizations...')
      fireEvent.change(input, { target: { value: 'Test' } })
      fireEvent.keyDown(input, { key: 'Tab' })

      expect(onSearch).not.toHaveBeenCalled()
    })
  })

  describe('status filter', () => {
    it('should render status filter when onStatusFilter is provided', () => {
      const onStatusFilter = vi.fn()
      render(<OrganizationsTable organizations={mockOrganizations} onStatusFilter={onStatusFilter} />)

      expect(screen.getByText('Filter by status')).toBeInTheDocument()
    })

    it('should not render status filter when onStatusFilter is not provided', () => {
      render(<OrganizationsTable organizations={mockOrganizations} />)

      expect(screen.queryByText('Filter by status')).not.toBeInTheDocument()
    })

    it('should call onStatusFilter when filter is changed', () => {
      const onStatusFilter = vi.fn()
      render(<OrganizationsTable organizations={mockOrganizations} onStatusFilter={onStatusFilter} />)

      // Open the select dropdown
      const trigger = screen.getByText('Filter by status')
      fireEvent.click(trigger)

      // Click on Active option
      const activeOption = screen.getByText('Active', { selector: '[role="option"]' })
      fireEvent.click(activeOption)

      expect(onStatusFilter).toHaveBeenCalledWith('active')
    })
  })

  describe('pagination', () => {
    it('should not render pagination when showPagination is false', () => {
      render(<OrganizationsTable organizations={mockOrganizations} showPagination={false} />)

      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })

    it('should not render pagination when totalPages is 1', () => {
      render(
        <OrganizationsTable
          organizations={mockOrganizations}
          showPagination={true}
          totalPages={1}
          currentPage={1}
        />
      )

      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })

    it('should render pagination when showPagination is true and multiple pages', () => {
      render(
        <OrganizationsTable
          organizations={mockOrganizations}
          showPagination={true}
          totalPages={5}
          currentPage={2}
        />
      )

      expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('should disable Previous button on first page', () => {
      render(
        <OrganizationsTable
          organizations={mockOrganizations}
          showPagination={true}
          totalPages={5}
          currentPage={1}
        />
      )

      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
    })

    it('should disable Next button on last page', () => {
      render(
        <OrganizationsTable
          organizations={mockOrganizations}
          showPagination={true}
          totalPages={5}
          currentPage={5}
        />
      )

      expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
    })

    it('should call onPageChange with previous page when Previous is clicked', () => {
      const onPageChange = vi.fn()
      render(
        <OrganizationsTable
          organizations={mockOrganizations}
          showPagination={true}
          totalPages={5}
          currentPage={3}
          onPageChange={onPageChange}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /previous/i }))

      expect(onPageChange).toHaveBeenCalledWith(2)
    })

    it('should call onPageChange with next page when Next is clicked', () => {
      const onPageChange = vi.fn()
      render(
        <OrganizationsTable
          organizations={mockOrganizations}
          showPagination={true}
          totalPages={5}
          currentPage={3}
          onPageChange={onPageChange}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /next/i }))

      expect(onPageChange).toHaveBeenCalledWith(4)
    })
  })

  describe('combined filters', () => {
    it('should render both search and status filter when both are provided', () => {
      const onSearch = vi.fn()
      const onStatusFilter = vi.fn()

      render(
        <OrganizationsTable
          organizations={mockOrganizations}
          onSearch={onSearch}
          onStatusFilter={onStatusFilter}
        />
      )

      expect(screen.getByPlaceholderText('Search organizations...')).toBeInTheDocument()
      expect(screen.getByText('Filter by status')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle organizations with zero values', () => {
      const orgZeroValues: OrganizationSummary = {
        id: 'org_zero',
        name: 'Zero Values Org',
        createdAt: '2024-01-01T00:00:00Z',
        subscriptionStatus: 'active',
        planName: 'Free',
        planSlug: 'free',
        usersCount: 0,
        jobsThisMonth: 0,
        mrr: 0,
        trialEndsAt: null,
        stripeCustomerId: null,
      }

      render(<OrganizationsTable organizations={[orgZeroValues]} />)

      expect(screen.getByText('Zero Values Org')).toBeInTheDocument()
      // Should show 0 for users and jobs
      const zeros = screen.getAllByText('0')
      expect(zeros.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle very long organization names', () => {
      const orgLongName: OrganizationSummary = {
        ...mockOrganizations[0],
        id: 'org_long',
        name: 'This Is A Very Long Organization Name That Might Cause Layout Issues In The Table Display',
      }

      render(<OrganizationsTable organizations={[orgLongName]} />)

      expect(screen.getByText(/This Is A Very Long Organization Name/)).toBeInTheDocument()
    })

    it('should handle large MRR values', () => {
      const orgLargeMrr: OrganizationSummary = {
        ...mockOrganizations[0],
        id: 'org_large_mrr',
        mrr: 99900000, // $999,000
      }

      render(<OrganizationsTable organizations={[orgLargeMrr]} />)

      expect(screen.getByText('$999,000.00')).toBeInTheDocument()
    })

    it('should handle single organization', () => {
      render(<OrganizationsTable organizations={[mockOrganizations[0]]} />)

      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(2) // 1 header + 1 data row
    })

    it('should handle many organizations', () => {
      const manyOrgs = Array.from({ length: 100 }, (_, i) => ({
        ...mockOrganizations[0],
        id: `org_${i}`,
        name: `Organization ${i}`,
      }))

      render(<OrganizationsTable organizations={manyOrgs} />)

      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(101) // 1 header + 100 data rows
    })
  })

  describe('unpaid status', () => {
    it('should render unpaid status with correct styling', () => {
      const orgUnpaid: OrganizationSummary = {
        ...mockOrganizations[0],
        id: 'org_unpaid',
        subscriptionStatus: 'unpaid',
      }

      render(<OrganizationsTable organizations={[orgUnpaid]} />)

      const badge = screen.getByText('Unpaid')
      expect(badge).toHaveClass('text-red-800', 'bg-red-100')
    })
  })

  describe('none status (no subscription)', () => {
    it('should handle organizations with no subscription status', () => {
      const orgNoSub: OrganizationSummary = {
        ...mockOrganizations[0],
        id: 'org_no_sub',
        subscriptionStatus: 'none',
      }

      render(<OrganizationsTable organizations={[orgNoSub]} />)

      expect(screen.getByText('No Plan')).toBeInTheDocument()
    })
  })
})
