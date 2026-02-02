import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OutlookCalendarCard } from '@/components/integrations/outlook-calendar-card'
import type { OrganizationIntegration } from '@/types/integrations'

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn()

describe('OutlookCalendarCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://oauth.example.com' }),
    })
  })

  it('renders Outlook Calendar title', () => {
    render(<OutlookCalendarCard integration={null} />)

    expect(screen.getByText('Outlook Calendar')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<OutlookCalendarCard integration={null} />)

    expect(screen.getByText('Sync jobs and appointments to Outlook Calendar')).toBeInTheDocument()
  })

  it('shows Not Connected badge when not connected', () => {
    render(<OutlookCalendarCard integration={null} />)

    expect(screen.getByText('Not Connected')).toBeInTheDocument()
  })

  it('shows Connected badge when connected', () => {
    const integration: OrganizationIntegration = {
      id: 'int-1',
      organization_id: 'org-1',
      provider: 'outlook_calendar',
      is_active: true,
      external_id: 'user@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sync_at: null,
      last_error: null,
    }

    render(<OutlookCalendarCard integration={integration} />)

    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('shows Connect button when not connected', () => {
    render(<OutlookCalendarCard integration={null} />)

    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })

  it('shows Disconnect button when connected', () => {
    const integration: OrganizationIntegration = {
      id: 'int-1',
      organization_id: 'org-1',
      provider: 'outlook_calendar',
      is_active: true,
      external_id: 'user@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sync_at: null,
      last_error: null,
    }

    render(<OutlookCalendarCard integration={integration} />)

    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
  })

  it('shows account info when connected', () => {
    const integration: OrganizationIntegration = {
      id: 'int-1',
      organization_id: 'org-1',
      provider: 'outlook_calendar',
      is_active: true,
      external_id: 'user@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sync_at: null,
      last_error: null,
    }

    render(<OutlookCalendarCard integration={integration} />)

    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('shows last synced time when available', () => {
    const integration: OrganizationIntegration = {
      id: 'int-1',
      organization_id: 'org-1',
      provider: 'outlook_calendar',
      is_active: true,
      external_id: 'user@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      last_error: null,
    }

    render(<OutlookCalendarCard integration={integration} />)

    expect(screen.getByText('Last Synced')).toBeInTheDocument()
  })

  it('shows Never when not synced', () => {
    const integration: OrganizationIntegration = {
      id: 'int-1',
      organization_id: 'org-1',
      provider: 'outlook_calendar',
      is_active: true,
      external_id: 'user@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sync_at: null,
      last_error: null,
    }

    render(<OutlookCalendarCard integration={integration} />)

    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('shows error alert when last_error exists', () => {
    const integration: OrganizationIntegration = {
      id: 'int-1',
      organization_id: 'org-1',
      provider: 'outlook_calendar',
      is_active: true,
      external_id: 'user@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sync_at: null,
      last_error: 'Token expired',
    }

    render(<OutlookCalendarCard integration={integration} />)

    expect(screen.getByText('Token expired')).toBeInTheDocument()
  })

  it('calls fetch on connect click', async () => {
    const user = userEvent.setup()
    render(<OutlookCalendarCard integration={null} />)

    await user.click(screen.getByRole('button', { name: /connect/i }))

    expect(global.fetch).toHaveBeenCalledWith('/api/integrations/outlook-calendar/connect')
  })
})
