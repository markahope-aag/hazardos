import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MailchimpCard } from '@/components/integrations/mailchimp-card'
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
  provider: 'mailchimp',
  external_id: 'us1',
  is_active: true,
  settings: {
    account_name: 'My Company',
    default_list_id: 'list-123',
  },
  last_sync_at: new Date().toISOString(),
  last_error: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('MailchimpCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, succeeded: 10, failed: 0 }),
    })
  })

  it('renders card title', () => {
    render(<MailchimpCard integration={null} />)

    expect(screen.getByText('Mailchimp')).toBeInTheDocument()
  })

  it('renders card description', () => {
    render(<MailchimpCard integration={null} />)

    expect(screen.getByText('Sync contacts and manage email marketing')).toBeInTheDocument()
  })

  it('shows Not Connected badge when not connected', () => {
    render(<MailchimpCard integration={null} />)

    expect(screen.getByText('Not Connected')).toBeInTheDocument()
  })

  it('shows Connect button when not connected', () => {
    render(<MailchimpCard integration={null} />)

    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })

  it('shows Connected badge when connected', () => {
    render(<MailchimpCard integration={mockIntegration} />)

    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('shows Disconnect button when connected', () => {
    render(<MailchimpCard integration={mockIntegration} />)

    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
  })

  it('shows Account name when connected', () => {
    render(<MailchimpCard integration={mockIntegration} />)

    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('My Company')).toBeInTheDocument()
  })

  it('shows Unknown when no account name', () => {
    const noAccountName = {
      ...mockIntegration,
      settings: { default_list_id: 'list-123' },
    }
    render(<MailchimpCard integration={noAccountName} />)

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('shows Data Center info when connected', () => {
    render(<MailchimpCard integration={mockIntegration} />)

    expect(screen.getByText('Data Center')).toBeInTheDocument()
    expect(screen.getByText('us1')).toBeInTheDocument()
  })

  it('shows Last Synced info when connected', () => {
    render(<MailchimpCard integration={mockIntegration} />)

    expect(screen.getByText('Last Synced')).toBeInTheDocument()
  })

  it('shows Never when never synced', () => {
    const neverSynced = { ...mockIntegration, last_sync_at: null }
    render(<MailchimpCard integration={neverSynced} />)

    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('shows Sync All Contacts button when connected', () => {
    render(<MailchimpCard integration={mockIntegration} />)

    expect(screen.getByRole('button', { name: /sync all contacts/i })).toBeInTheDocument()
  })

  it('shows error alert when last_error exists', () => {
    const withError = { ...mockIntegration, last_error: 'Invalid API key' }
    render(<MailchimpCard integration={withError} />)

    expect(screen.getByText('Invalid API key')).toBeInTheDocument()
  })

  it('calls connect API when Connect is clicked', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://login.mailchimp.com/oauth2/authorize' }),
    })

    render(<MailchimpCard integration={null} />)

    await user.click(screen.getByRole('button', { name: /connect/i }))

    expect(mockFetch).toHaveBeenCalledWith('/api/integrations/mailchimp/connect')
  })

  it('shows Connecting... when connect is in progress', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(<MailchimpCard integration={null} />)

    await user.click(screen.getByRole('button', { name: /connect/i }))

    expect(screen.getByRole('button', { name: /connecting/i })).toBeInTheDocument()
  })

  it('calls sync API when Sync All Contacts is clicked', async () => {
    const user = userEvent.setup()
    render(<MailchimpCard integration={mockIntegration} />)

    await user.click(screen.getByRole('button', { name: /sync all contacts/i }))

    expect(mockFetch).toHaveBeenCalledWith('/api/integrations/mailchimp/sync/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_id: 'list-123' }),
    })
  })

  it('shows toast on successful sync', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, succeeded: 20, failed: 1 }),
    })

    render(<MailchimpCard integration={mockIntegration} />)

    await user.click(screen.getByRole('button', { name: /sync all contacts/i }))

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Sync Complete',
      description: 'Synced 20 contacts (1 failed)',
    })
  })

  it('shows configuration toast when no default list', async () => {
    const user = userEvent.setup()
    const noList = { ...mockIntegration, settings: { account_name: 'Test' } }
    render(<MailchimpCard integration={noList} />)

    await user.click(screen.getByRole('button', { name: /sync all contacts/i }))

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Configuration Required',
      description: 'Please select a default audience list first',
      variant: 'destructive',
    })
  })
})
