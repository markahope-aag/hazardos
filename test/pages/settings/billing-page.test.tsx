import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Supabase server with proper chaining
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => {
    const mockClient = {
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'user-123' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { organization_id: 'org-123', role: 'admin' },
                }),
              }),
            }),
          }
        }
        if (table === 'organization_subscriptions') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'sub-1',
                    plan_id: 'plan-pro',
                    status: 'active',
                    plan: { id: 'plan-pro', name: 'Pro', slug: 'pro', price_monthly: 49 },
                  },
                }),
              }),
            }),
          }
        }
        if (table === 'subscription_plans') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => Promise.resolve({
                    data: [
                      { id: 'plan-starter', name: 'Starter', slug: 'starter', price_monthly: 29, is_active: true, is_public: true },
                      { id: 'plan-pro', name: 'Pro', slug: 'pro', price_monthly: 49, is_active: true, is_public: true },
                    ],
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'billing_invoices') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({
                    data: [
                      { id: 'inv-1', invoice_number: 'INV-001', total: 4900, status: 'paid' },
                    ],
                  }),
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null }),
            }),
          }),
        }
      }),
    }
    return Promise.resolve(mockClient)
  },
}))

// Mock billing components
vi.mock('@/components/billing/subscription-card', () => ({
  SubscriptionCard: ({ subscription, isAdmin }: { subscription: unknown; isAdmin: boolean }) => (
    <div data-testid="subscription-card">
      Subscription: {subscription ? 'Active' : 'None'}, Admin: {isAdmin ? 'Yes' : 'No'}
    </div>
  ),
}))

vi.mock('@/components/billing/invoice-history', () => ({
  InvoiceHistory: ({ invoices }: { invoices: unknown[] }) => (
    <div data-testid="invoice-history">Invoices: {invoices?.length || 0}</div>
  ),
}))

vi.mock('@/components/billing/plan-selector', () => ({
  PlanSelector: ({ plans, currentPlanId }: { plans: unknown[]; currentPlanId: string }) => (
    <div data-testid="plan-selector">
      Plans: {plans?.length || 0}, Current: {currentPlanId || 'none'}
    </div>
  ),
}))

// Import after mocks
import BillingSettingsPage from '@/app/(dashboard)/settings/billing/page'

describe('BillingSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await BillingSettingsPage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await BillingSettingsPage()
    render(page)

    expect(screen.getByText('Billing & Subscription')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await BillingSettingsPage()
    render(page)

    expect(screen.getByText('Manage your subscription and billing settings')).toBeInTheDocument()
  })

  it('renders subscription card', async () => {
    const page = await BillingSettingsPage()
    render(page)

    expect(screen.getByTestId('subscription-card')).toBeInTheDocument()
  })

  it('passes subscription to subscription card', async () => {
    const page = await BillingSettingsPage()
    render(page)

    expect(screen.getByText(/Subscription: Active/)).toBeInTheDocument()
  })

  it('passes admin status to subscription card', async () => {
    const page = await BillingSettingsPage()
    render(page)

    expect(screen.getByText(/Admin: Yes/)).toBeInTheDocument()
  })

  it('renders plan selector for admins', async () => {
    const page = await BillingSettingsPage()
    render(page)

    expect(screen.getByTestId('plan-selector')).toBeInTheDocument()
  })

  it('renders invoice history', async () => {
    const page = await BillingSettingsPage()
    render(page)

    expect(screen.getByTestId('invoice-history')).toBeInTheDocument()
  })

  it('passes invoices to invoice history', async () => {
    const page = await BillingSettingsPage()
    render(page)

    expect(screen.getByText(/Invoices: 1/)).toBeInTheDocument()
  })
})
