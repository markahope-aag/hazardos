import { describe, it, expect, vi } from 'vitest'
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
  Shield: () => <div data-testid="icon-shield" />,
  Palette: () => <div data-testid="icon-palette" />,
}))

describe('SettingsPage (landing)', () => {
  it('renders without crashing', () => {
    expect(() => render(<SettingsPage />)).not.toThrow()
  })

  it('groups settings by section', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Organization')).toBeInTheDocument()
    expect(screen.getByText('Workflow')).toBeInTheDocument()
    // "Integrations" is both a group heading and an item label —
    // two matches are expected.
    expect(screen.getAllByText('Integrations')).toHaveLength(2)
    expect(screen.getByText('Communications')).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  it('lists every section item by label', () => {
    render(<SettingsPage />)
    // Organization
    expect(screen.getByText('Company Profile')).toBeInTheDocument()
    expect(screen.getByText('Team Members')).toBeInTheDocument()
    expect(screen.getByText('Locations')).toBeInTheDocument()
    // Workflow
    expect(screen.getByText('Pricing')).toBeInTheDocument()
    expect(screen.getByText('Billing')).toBeInTheDocument()
    // Integrations group label conflicts with the item label "Integrations"
    // — using getAllByText since both render.
    expect(screen.getAllByText('Integrations').length).toBeGreaterThan(0)
    expect(screen.getByText('API Keys')).toBeInTheDocument()
    expect(screen.getByText('Webhooks')).toBeInTheDocument()
    // Communications
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('SMS')).toBeInTheDocument()
    // Account
    expect(screen.getByText('Security')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
  })

  it('links each item to its subroute', () => {
    render(<SettingsPage />)
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
        '/settings/notifications',
        '/settings/sms',
        '/settings/security',
        '/settings/branding',
      ]),
    )
  })
})
