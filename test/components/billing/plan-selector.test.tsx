import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlanSelector } from '@/components/billing/plan-selector'
import type { SubscriptionPlan } from '@/types/billing'

// Mock toast
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { origin: 'http://localhost:3000', href: '' },
  writable: true,
})

const mockPlans: SubscriptionPlan[] = [
  {
    id: 'plan_starter',
    slug: 'starter',
    name: 'Starter',
    description: 'Perfect for small teams',
    price_monthly: 2900, // $29.00
    price_yearly: 29000, // $290.00 (10 months)
    is_popular: false,
    features: [
      'Up to 5 users',
      '50 jobs per month',
      '10GB storage',
      'Email support',
    ],
  },
  {
    id: 'plan_pro',
    slug: 'pro', // Component checks slug === 'pro' for popular styling
    name: 'Professional',
    description: 'Best for growing businesses',
    price_monthly: 9900, // $99.00
    price_yearly: 99000, // $990.00 (10 months)
    is_popular: true,
    features: [
      'Up to 25 users',
      'Unlimited jobs',
      '100GB storage',
      'Priority support',
      'Advanced reporting',
    ],
  },
  {
    id: 'plan_enterprise',
    slug: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price_monthly: 19900, // $199.00
    price_yearly: 199000, // $1,990.00 (10 months)
    is_popular: false,
    features: [
      'Unlimited users',
      'Unlimited jobs',
      '1TB storage',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
]

describe('PlanSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all plans', () => {
    render(<PlanSelector plans={mockPlans} />)
    
    expect(screen.getByText('Starter')).toBeInTheDocument()
    expect(screen.getByText('Professional')).toBeInTheDocument()
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
  })

  it('should show plan descriptions', () => {
    render(<PlanSelector plans={mockPlans} />)
    
    expect(screen.getByText('Perfect for small teams')).toBeInTheDocument()
    expect(screen.getByText('Best for growing businesses')).toBeInTheDocument()
    expect(screen.getByText('For large organizations')).toBeInTheDocument()
  })

  it('should show monthly prices by default', () => {
    render(<PlanSelector plans={mockPlans} />)
    
    expect(screen.getByText('$29')).toBeInTheDocument()
    expect(screen.getByText('$99')).toBeInTheDocument()
    expect(screen.getByText('$199')).toBeInTheDocument()
  })

  it('should show yearly prices when yearly billing is selected', () => {
    render(<PlanSelector plans={mockPlans} />)

    const billingToggle = screen.getByRole('switch')
    fireEvent.click(billingToggle)

    // Yearly prices are displayed as monthly equivalent (price_yearly / 12)
    // $290/12 = $24.17, $990/12 = $82.50, $1990/12 = $165.83
    expect(screen.getByText('$24')).toBeInTheDocument()
    expect(screen.getByText('$83')).toBeInTheDocument()
    expect(screen.getByText('$166')).toBeInTheDocument()
  })

  it('should show popular badge for popular plan', () => {
    render(<PlanSelector plans={mockPlans} />)
    
    expect(screen.getByText('Most Popular')).toBeInTheDocument()
  })

  it('should highlight popular plan', () => {
    render(<PlanSelector plans={mockPlans} />)
    
    const professionalCard = screen.getByText('Professional').closest('.relative')
    expect(professionalCard).toHaveClass('border-primary')
  })

  it('should show current plan badge', () => {
    render(<PlanSelector plans={mockPlans} currentPlanId="plan_pro" />)
    
    expect(screen.getByText('Current Plan')).toBeInTheDocument()
  })

  it('should disable current plan button', () => {
    render(<PlanSelector plans={mockPlans} currentPlanId="plan_pro" />)
    
    const currentPlanButton = screen.getByRole('button', { name: /current plan/i })
    expect(currentPlanButton).toBeDisabled()
  })

  it('should list plan features', () => {
    render(<PlanSelector plans={mockPlans} />)
    
    expect(screen.getByText('Up to 5 users')).toBeInTheDocument()
    expect(screen.getByText('50 jobs per month')).toBeInTheDocument()
    expect(screen.getByText('10GB storage')).toBeInTheDocument()
    expect(screen.getByText('Email support')).toBeInTheDocument()
  })

  it('should create checkout session when plan is selected', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/session_123' }),
    })

    render(<PlanSelector plans={mockPlans} />)

    const starterButton = screen.getByRole('button', { name: /select plan/i })
    fireEvent.click(starterButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_slug: 'starter',
          billing_cycle: 'monthly',
          success_url: 'http://localhost:3000/settings/billing?success=true',
          cancel_url: 'http://localhost:3000/settings/billing?canceled=true',
        }),
      })
    })

    expect(window.location.href).toBe('https://checkout.stripe.com/session_123')
  })

  it('should use yearly billing cycle when selected', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/session_123' }),
    })

    render(<PlanSelector plans={mockPlans} />)

    // Switch to yearly billing
    const billingToggle = screen.getByRole('switch')
    fireEvent.click(billingToggle)

    const starterButton = screen.getByRole('button', { name: /select plan/i })
    fireEvent.click(starterButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"billing_cycle":"yearly"'),
      })
    })
  })

  it('should show loading state when creating checkout', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<PlanSelector plans={mockPlans} />)

    const starterButton = screen.getByRole('button', { name: /select plan/i })
    fireEvent.click(starterButton)

    await waitFor(() => {
      expect(starterButton).toBeDisabled()
      expect(starterButton.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  it('should handle checkout creation error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    render(<PlanSelector plans={mockPlans} />)

    const starterButton = screen.getByRole('button', { name: /select plan/i })
    fireEvent.click(starterButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to start checkout',
        variant: 'destructive',
      })
    })
  })

  it('should handle network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<PlanSelector plans={mockPlans} />)

    const starterButton = screen.getByRole('button', { name: /select plan/i })
    fireEvent.click(starterButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to start checkout',
        variant: 'destructive',
      })
    })
  })

  it('should show billing cycle toggle', () => {
    render(<PlanSelector plans={mockPlans} />)
    
    expect(screen.getByText('Monthly')).toBeInTheDocument()
    expect(screen.getByText('Yearly')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('should show savings for yearly billing', () => {
    render(<PlanSelector plans={mockPlans} />)
    
    const billingToggle = screen.getByRole('switch')
    fireEvent.click(billingToggle)
    
    // Should show savings text
    expect(screen.getByText(/save/i)).toBeInTheDocument()
  })

  it('should format currency correctly', () => {
    const expensivePlan: SubscriptionPlan = {
      id: 'plan_expensive',
      slug: 'expensive',
      name: 'Expensive',
      description: 'Very expensive plan',
      price_monthly: 123456, // $1,234.56
      price_yearly: 1234560, // $12,345.60
      is_popular: false,
      features: ['Everything'],
    }

    render(<PlanSelector plans={[expensivePlan]} />)
    
    expect(screen.getByText('$1,235')).toBeInTheDocument() // Rounded up
  })

  it('should handle plans with no features', () => {
    const minimalPlan: SubscriptionPlan = {
      id: 'plan_minimal',
      slug: 'minimal',
      name: 'Minimal',
      description: 'Basic plan',
      price_monthly: 1000,
      price_yearly: 10000,
      is_popular: false,
      features: [],
    }

    render(<PlanSelector plans={[minimalPlan]} />)
    
    expect(screen.getByText('Minimal')).toBeInTheDocument()
    expect(screen.getByText('Basic plan')).toBeInTheDocument()
  })

  it('should handle empty plans array', () => {
    render(<PlanSelector plans={[]} />)
    
    // Should render without crashing
    expect(screen.getByText('Monthly')).toBeInTheDocument()
    expect(screen.getByText('Yearly')).toBeInTheDocument()
  })

  it('should show upgrade button for non-current plans', () => {
    render(<PlanSelector plans={mockPlans} currentPlanId="plan_starter" />)
    
    // Starter should show "Current Plan"
    expect(screen.getByText('Current Plan')).toBeInTheDocument()
    
    // Other plans should show "Upgrade" or "Get Started"
    const upgradeButtons = screen.getAllByRole('button', { name: /upgrade|get started/i })
    expect(upgradeButtons.length).toBeGreaterThan(0)
  })

  it('should maintain loading state per plan', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<PlanSelector plans={mockPlans} />)
    
    const starterButton = screen.getByRole('button', { name: /get started/i })
    const proButtons = screen.getAllByRole('button', { name: /get started|upgrade/i })
    
    fireEvent.click(starterButton)
    
    await waitFor(() => {
      // Only the clicked button should be loading
      expect(starterButton).toBeDisabled()
      expect(starterButton.querySelector('.animate-spin')).toBeInTheDocument()
      
      // Other buttons should still be enabled
      proButtons.forEach(button => {
        if (button !== starterButton) {
          expect(button).not.toBeDisabled()
        }
      })
    })
  })

  it('should have proper accessibility attributes', () => {
    render(<PlanSelector plans={mockPlans} />)
    
    // Billing toggle should have proper labeling
    const billingToggle = screen.getByRole('switch')
    expect(billingToggle).toHaveAttribute('aria-checked')
    
    // Plan cards should be properly structured
    const planButtons = screen.getAllByRole('button', { name: /get started|upgrade|current plan/i })
    planButtons.forEach(button => {
      expect(button).toBeInTheDocument()
    })
  })
})