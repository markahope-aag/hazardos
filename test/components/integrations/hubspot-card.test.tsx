import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HubSpotCard } from '@/components/integrations/hubspot-card'
import type { OrganizationIntegration } from '@/types/integrations'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockReplace = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
}))

// Mock toast
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockIntegration: OrganizationIntegration = {
  id: 'int-1',
  organization_id: 'org-1',
  provider: 'hubspot',
  external_id: 'portal-123',
  is_active: true,
  settings: {},
  last_sync_at: new Date().toISOString(),
  last_error: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('HubSpotCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, succeeded: 10, failed: 0 }),
    })
  })

  it('renders card title', () => {
    render(<HubSpotCard integration={null} />)

    expect(screen.getByText('HubSpot')).toBeInTheDocument()
  })

  it('renders card description', () => {
    render(<HubSpotCard integration={null} />)

    expect(screen.getByText('Sync contacts and manage CRM')).toBeInTheDocument()
  })

  it('shows Not Connected badge when not connected', () => {
    render(<HubSpotCard integration={null} />)

    expect(screen.getByText('Not Connected')).toBeInTheDocument()
  })

  it('shows Connect button when not connected', () => {
    render(<HubSpotCard integration={null} />)

    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })

  it('shows Connected badge when connected', () => {
    render(<HubSpotCard integration={mockIntegration} />)

    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('shows Disconnect button when connected', () => {
    render(<HubSpotCard integration={mockIntegration} />)

    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
  })

  it('shows Portal ID when connected', () => {
    render(<HubSpotCard integration={mockIntegration} />)

    expect(screen.getByText('Portal ID')).toBeInTheDocument()
    expect(screen.getByText('portal-123')).toBeInTheDocument()
  })

  it('shows Last Synced info when connected', () => {
    render(<HubSpotCard integration={mockIntegration} />)

    expect(screen.getByText('Last Synced')).toBeInTheDocument()
  })

  it('shows Never when never synced', () => {
    const neverSynced = { ...mockIntegration, last_sync_at: null }
    render(<HubSpotCard integration={neverSynced} />)

    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('shows Sync All Contacts button when connected', () => {
    render(<HubSpotCard integration={mockIntegration} />)

    expect(screen.getByRole('button', { name: /sync all contacts/i })).toBeInTheDocument()
  })

  it('shows error alert when last_error exists', () => {
    const withError = { ...mockIntegration, last_error: 'API rate limit exceeded' }
    render(<HubSpotCard integration={withError} />)

    expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument()
  })

  it('calls connect API when Connect is clicked', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://app.hubspot.com/oauth/authorize' }),
    })

    render(<HubSpotCard integration={null} />)

    await user.click(screen.getByRole('button', { name: /connect/i }))

    expect(mockFetch).toHaveBeenCalledWith('/api/integrations/hubspot/connect')
  })

  it('shows Connecting... when connect is in progress', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(<HubSpotCard integration={null} />)

    await user.click(screen.getByRole('button', { name: /connect/i }))

    expect(screen.getByRole('button', { name: /connecting/i })).toBeInTheDocument()
  })

  it('calls sync API when Sync All Contacts is clicked', async () => {
    const user = userEvent.setup()
    render(<HubSpotCard integration={mockIntegration} />)

    await user.click(screen.getByRole('button', { name: /sync all contacts/i }))

    expect(mockFetch).toHaveBeenCalledWith('/api/integrations/hubspot/sync/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  })

  it('shows toast on successful sync', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, succeeded: 15, failed: 2 }),
    })

    render(<HubSpotCard integration={mockIntegration} />)

    await user.click(screen.getByRole('button', { name: /sync all contacts/i }))

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Sync Complete',
      description: 'Synced 15 contacts (2 failed)',
    })
  })
})
