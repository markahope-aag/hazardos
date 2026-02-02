import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SubscriptionCard } from '@/components/billing/subscription-card'
import type { OrganizationSubscription } from '@/types/billing'

// Mock toast
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  },
}))

// Mock billing types
vi.mock('@/types/billing', () => ({
  subscriptionStatusConfig: {
    active: {
      label: 'Active',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    },
    trialing: {
      label: 'Trial',
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
    },
    past_due: {
      label: 'Past Due',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
    },
    canceled: {
      label: 'Canceled',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
    },
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockSubscription: OrganizationSubscription = {
  id: 'sub_123',
  status: 'active',
  current_period_end: '2024-03-01T00:00:00Z',
  trial_end: null,
  cancel_at_period_end: false,
  billing_cycle: 'monthly',
  users_count: 3,
  jobs_this_month: 15,
  storage_used_mb: 2048,
  plan: {
    id: 'plan_pro',
    name: 'Professional',
    price_monthly: 9900, // $99.00
    max_users: 10,
    max_jobs_per_month: 100,
    max_storage_gb: 50,
  },
}

const mockTrialSubscription: OrganizationSubscription = {
  ...mockSubscription,
  status: 'trialing',
  trial_end: '2024-02-15T00:00:00Z',
}

describe('SubscriptionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:3000' },
      writable: true,
    })
  })

  describe('with no subscription', () => {
    it('should render no subscription state', () => {
      render(<SubscriptionCard subscription={null} isAdmin={true} />)
      
      expect(screen.getByText('No Active Subscription')).toBeInTheDocument()
      expect(screen.getByText('Choose a plan below to get started')).toBeInTheDocument()
    })

    it('should not show manage billing button when no subscription', () => {
      render(<SubscriptionCard subscription={null} isAdmin={true} />)
      
      expect(screen.queryByText('Manage Billing')).not.toBeInTheDocument()
    })
  })

  describe('with active subscription', () => {
    it('should render subscription details', () => {
      render(<SubscriptionCard subscription={mockSubscription} isAdmin={true} />)
      
      expect(screen.getByText('Professional Plan')).toBeInTheDocument()
      expect(screen.getByText('$99.00/month')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('should show current period end date', () => {
      render(<SubscriptionCard subscription={mockSubscription} isAdmin={true} />)
      
      expect(screen.getByText('Current Period Ends')).toBeInTheDocument()
      expect(screen.getByText('Mar 1, 2024')).toBeInTheDocument()
    })

    it('should show manage billing button for admins', () => {
      render(<SubscriptionCard subscription={mockSubscription} isAdmin={true} />)
      
      expect(screen.getByRole('button', { name: /manage billing/i })).toBeInTheDocument()
    })

    it('should not show manage billing button for non-admins', () => {
      render(<SubscriptionCard subscription={mockSubscription} isAdmin={false} />)
      
      expect(screen.queryByRole('button', { name: /manage billing/i })).not.toBeInTheDocument()
    })

    it('should display usage information', () => {
      render(<SubscriptionCard subscription={mockSubscription} isAdmin={true} />)
      
      expect(screen.getByText('Usage This Month')).toBeInTheDocument()
      expect(screen.getByText('3 / 10')).toBeInTheDocument() // Users
      expect(screen.getByText('15 / 100')).toBeInTheDocument() // Jobs
      expect(screen.getByText('2.0 GB / 50 GB')).toBeInTheDocument() // Storage
    })

    it('should render progress bars for usage', () => {
      render(<SubscriptionCard subscription={mockSubscription} isAdmin={true} />)
      
      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars).toHaveLength(3) // Users, Jobs, Storage
    })

    it('should handle yearly billing cycle', () => {
      const yearlySubscription = {
        ...mockSubscription,
        billing_cycle: 'yearly' as const,
      }
      
      render(<SubscriptionCard subscription={yearlySubscription} isAdmin={true} />)
      
      expect(screen.getByText('$99.00/month (billed annually)')).toBeInTheDocument()
    })
  })

  describe('with trial subscription', () => {
    it('should show trial status and end date', () => {
      render(<SubscriptionCard subscription={mockTrialSubscription} isAdmin={true} />)
      
      expect(screen.getByText('Trial')).toBeInTheDocument()
      expect(screen.getByText('Trial Ends')).toBeInTheDocument()
      expect(screen.getByText('Feb 15, 2024')).toBeInTheDocument()
    })
  })

  describe('with cancellation scheduled', () => {
    it('should show cancellation warning', () => {
      const cancelingSubscription = {
        ...mockSubscription,
        cancel_at_period_end: true,
      }
      
      render(<SubscriptionCard subscription={cancelingSubscription} isAdmin={true} />)
      
      expect(screen.getByText('Subscription will cancel at end of billing period')).toBeInTheDocument()
    })
  })

  describe('billing portal integration', () => {
    it('should open billing portal when manage billing is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://billing.stripe.com/session_123' }),
      })

      render(<SubscriptionCard subscription={mockSubscription} isAdmin={true} />)
      
      const manageButton = screen.getByRole('button', { name: /manage billing/i })
      fireEvent.click(manageButton)
      
      expect(mockFetch).toHaveBeenCalledWith('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_url: 'http://localhost:3000',
        }),
      })

      await waitFor(() => {
        expect(window.location.href).toBe('https://billing.stripe.com/session_123')
      })
    })

    it('should show loading state when opening billing portal', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(<SubscriptionCard subscription={mockSubscription} isAdmin={true} />)
      
      const manageButton = screen.getByRole('button', { name: /manage billing/i })
      fireEvent.click(manageButton)
      
      expect(manageButton).toBeDisabled()
      expect(screen.getByRole('generic', { name: '' })).toHaveClass('animate-spin')
    })

    it('should handle billing portal error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      render(<SubscriptionCard subscription={mockSubscription} isAdmin={true} />)
      
      const manageButton = screen.getByRole('button', { name: /manage billing/i })
      fireEvent.click(manageButton)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to open billing portal',
          variant: 'destructive',
        })
      })

      // Button should be enabled again
      expect(manageButton).not.toBeDisabled()
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<SubscriptionCard subscription={mockSubscription} isAdmin={true} />)
      
      const manageButton = screen.getByRole('button', { name: /manage billing/i })
      fireEvent.click(manageButton)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to open billing portal',
          variant: 'destructive',
        })
      })
    })
  })

  describe('edge cases', () => {
    it('should handle subscription without plan', () => {
      const subscriptionNoPlan = {
        ...mockSubscription,
        plan: null,
      }
      
      render(<SubscriptionCard subscription={subscriptionNoPlan} isAdmin={true} />)
      
      expect(screen.getByText('Unknown Plan')).toBeInTheDocument()
      expect(screen.getByText('$0/month')).toBeInTheDocument()
    })

    it('should handle missing usage limits', () => {
      const subscriptionNoLimits = {
        ...mockSubscription,
        plan: {
          ...mockSubscription.plan!,
          max_users: null,
          max_jobs_per_month: null,
          max_storage_gb: null,
        },
      }
      
      render(<SubscriptionCard subscription={subscriptionNoLimits} isAdmin={true} />)
      
      expect(screen.queryByText('Users')).not.toBeInTheDocument()
      expect(screen.queryByText('Jobs')).not.toBeInTheDocument()
      expect(screen.queryByText('Storage')).not.toBeInTheDocument()
    })

    it('should handle different subscription statuses', () => {
      const pastDueSubscription = {
        ...mockSubscription,
        status: 'past_due' as const,
      }
      
      render(<SubscriptionCard subscription={pastDueSubscription} isAdmin={true} />)
      
      expect(screen.getByText('Past Due')).toBeInTheDocument()
    })

    it('should format currency correctly', () => {
      const expensivePlan = {
        ...mockSubscription,
        plan: {
          ...mockSubscription.plan!,
          price_monthly: 199900, // $1,999.00
        },
      }
      
      render(<SubscriptionCard subscription={expensivePlan} isAdmin={true} />)
      
      expect(screen.getByText('$1,999.00/month')).toBeInTheDocument()
    })

    it('should calculate storage usage correctly', () => {
      const highStorageSubscription = {
        ...mockSubscription,
        storage_used_mb: 25600, // 25 GB
        plan: {
          ...mockSubscription.plan!,
          max_storage_gb: 50,
        },
      }
      
      render(<SubscriptionCard subscription={highStorageSubscription} isAdmin={true} />)
      
      expect(screen.getByText('25.0 GB / 50 GB')).toBeInTheDocument()
    })
  })
})