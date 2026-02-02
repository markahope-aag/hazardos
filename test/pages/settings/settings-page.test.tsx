import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SettingsPage from '@/app/(dashboard)/settings/page'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  DollarSign: () => <div data-testid="dollar-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Building: () => <div data-testid="building-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Palette: () => <div data-testid="palette-icon" />,
  Link2: () => <div data-testid="link-icon" />,
}))

describe('SettingsPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<SettingsPage />)).not.toThrow()
  })

  it('displays settings heading', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('displays organization settings description', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Manage your organization settings')).toBeInTheDocument()
  })

  it('renders all settings groups', () => {
    render(<SettingsPage />)

    // Check for all settings group titles
    expect(screen.getByText('Pricing')).toBeInTheDocument()
    expect(screen.getByText('Integrations')).toBeInTheDocument()
    expect(screen.getByText('Team Members')).toBeInTheDocument()
    expect(screen.getByText('Company Profile')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Security')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
  })

  it('renders all settings group descriptions', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Labor rates, equipment costs, disposal fees, and markup settings')).toBeInTheDocument()
    expect(screen.getByText('Connect QuickBooks and other business tools')).toBeInTheDocument()
    expect(screen.getByText('Manage users, roles, and permissions')).toBeInTheDocument()
    expect(screen.getByText('Business information, logo, and contact details')).toBeInTheDocument()
    expect(screen.getByText('Email alerts and reminder preferences')).toBeInTheDocument()
    expect(screen.getByText('Password, two-factor authentication, and sessions')).toBeInTheDocument()
    expect(screen.getByText('Theme, branding, and display preferences')).toBeInTheDocument()
  })

  it('renders correct links for settings groups', () => {
    render(<SettingsPage />)

    const links = screen.getAllByRole('link')
    const hrefs = links.map(link => link.getAttribute('href'))

    expect(hrefs).toContain('/settings/pricing')
    expect(hrefs).toContain('/settings/integrations')
    expect(hrefs).toContain('/settings/team')
    expect(hrefs).toContain('/settings/company')
    expect(hrefs).toContain('/settings/notifications')
    expect(hrefs).toContain('/settings/security')
    expect(hrefs).toContain('/settings/appearance')
  })
})
