import { describe, it, expect, vi } from 'vitest'
import type React from 'react'
import { render, screen } from '@testing-library/react'
import SettingsPage from '@/app/(dashboard)/settings/page'

// The sidebar/landing page pulls a bunch of lucide icons via SETTINGS_NAV.
// Any icon the array references has to be mocked or the import crashes.
vi.mock('lucide-react', () => ({
  Building2: () => <div data-testid="icon-building2" />,
  Users: () => <div data-testid="icon-users" />,
  MapPin: () => <div data-testid="icon-mappin" />,
  DollarSign: () => <div data-testid="icon-dollar" />,
  CreditCard: () => <div data-testid="icon-credit" />,
  Link2: () => <div data-testid="icon-link2" />,
  KeyRound: () => <div data-testid="icon-key" />,
  Webhook: () => <div data-testid="icon-webhook" />,
  Bell: () => <div data-testid="icon-bell" />,
  MessageSquare: () => <div data-testid="icon-msg" />,
  Mail: () => <div data-testid="icon-mail" />,
  Shield: () => <div data-testid="icon-shield" />,
  ShieldCheck: () => <div data-testid="icon-shield-check" />,
  Palette: () => <div data-testid="icon-palette" />,
}))

// SettingsPage is a server component that awaits the Supabase profile
// lookup and filters items by role. The supabase mock from test/setup.ts
// returns null profiles by default, which would hide every role-gated
// item — so for these tests we provide a tenant_owner profile so the
// full nav surface renders.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { organization_id: 'org-123', role: 'tenant_owner' },
              }),
            }),
          }),
        }
      }
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { billing_managed_externally: false },
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
  }),
}))

async function renderPage() {
  const ui = (await SettingsPage()) as React.ReactElement
  return render(ui)
}

describe('SettingsPage (landing)', () => {
  it('renders without crashing', async () => {
    await expect(renderPage()).resolves.not.toThrow()
  })

  it('groups settings by section', async () => {
    await renderPage()
    expect(screen.getByText('Organization')).toBeInTheDocument()
    expect(screen.getByText('Workflow')).toBeInTheDocument()
    // "Integrations" is both a group heading and an item label —
    // two matches are expected.
    expect(screen.getAllByText('Integrations')).toHaveLength(2)
    expect(screen.getByText('Communications')).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  it('lists every section item by label', async () => {
    await renderPage()
    // Organization
    expect(screen.getByText('Company Profile')).toBeInTheDocument()
    expect(screen.getByText('Team Members')).toBeInTheDocument()
    expect(screen.getByText('Locations')).toBeInTheDocument()
    // Workflow
    expect(screen.getByText('Pricing')).toBeInTheDocument()
    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.getAllByText('Integrations').length).toBeGreaterThan(0)
    expect(screen.getByText('API Keys')).toBeInTheDocument()
    expect(screen.getByText('Webhooks')).toBeInTheDocument()
    // Communications
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('SMS')).toBeInTheDocument()
    // Account
    expect(screen.getByText('Security')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
  })

  it('links each item to its subroute', async () => {
    await renderPage()
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(
      expect.arrayContaining([
        '/settings/company',
        '/settings/team',
        '/settings/locations',
        '/settings/pricing',
        '/settings/billing',
        '/settings/integrations',
        '/settings/api',
        '/settings/webhooks',
        '/settings/email',
        '/settings/notifications',
        '/settings/sms',
        '/settings/security',
        '/settings/branding',
      ]),
    )
  })
})
