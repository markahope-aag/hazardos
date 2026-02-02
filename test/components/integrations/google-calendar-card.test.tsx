import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GoogleCalendarCard, GoogleCalendarCardErrorBoundary } from '@/components/integrations/google-calendar-card'
import type { OrganizationIntegration } from '@/types/integrations'

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockRefresh = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh
  }),
  useSearchParams: () => mockSearchParams,
}))

// Mock toast
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
}))

// Mock error boundary
vi.mock('@/components/error-boundaries', () => ({
  IntegrationErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockActiveIntegration: OrganizationIntegration = {
  id: 'integration_123',
  integration_type: 'google_calendar',
  is_active: true,
  settings: {
    calendar_id: 'primary',
    sync_enabled: true,
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  last_sync_at: '2024-01-15T12:00:00Z',
  last_sync_status: 'success',
}

const mockInactiveIntegration: OrganizationIntegration = {
  id: 'integration_456',
  integration_type: 'google_calendar',
  is_active: false,
  settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  last_sync_at: null,
  last_sync_status: null,
}

describe('GoogleCalendarCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear all search params
    Array.from(mockSearchParams.keys()).forEach(key => mockSearchParams.delete(key))
  })

  it('should render connection button when not connected', () => {
    render(<GoogleCalendarCard integration={null} />)

    expect(screen.getByText('Google Calendar')).toBeInTheDocument()
    expect(screen.getByText(/sync jobs and appointments/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })

  it('should render connected state when integration is active', () => {
    render(<GoogleCalendarCard integration={mockActiveIntegration} />)
    
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText(/last synced/i)).toBeInTheDocument()
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
  })

  it('should render inactive state when integration exists but is inactive', () => {
    render(<GoogleCalendarCard integration={mockInactiveIntegration} />)

    expect(screen.getByText('Not Connected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })

  it('should show success message from URL params', () => {
    mockSearchParams.set('success', 'google_calendar')

    render(<GoogleCalendarCard integration={mockActiveIntegration} />)

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Google Calendar connected successfully!',
    })
  })

  it('should show error message from URL params', () => {
    mockSearchParams.set('error', 'access_denied')
    mockSearchParams.set('integration', 'google_calendar')

    render(<GoogleCalendarCard integration={null} />)

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Connection Failed',
      description: 'Failed to connect Google Calendar: access_denied',
      variant: 'destructive',
    })
  })

  it('should handle generic error from URL params', () => {
    mockSearchParams.set('error', 'unknown_error')
    mockSearchParams.set('integration', 'google_calendar')

    render(<GoogleCalendarCard integration={null} />)

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Connection Failed',
      description: 'Failed to connect Google Calendar: unknown_error',
      variant: 'destructive',
    })
  })

  it('should initiate connection when connect button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://accounts.google.com/oauth/authorize?...' }),
    })

    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })

    render(<GoogleCalendarCard integration={null} />)

    const connectButton = screen.getByRole('button', { name: /connect/i })
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/integrations/google-calendar/connect')
    })

    expect(window.location.href).toBe('https://accounts.google.com/oauth/authorize?...')
  })

  it('should show loading state during connection', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<GoogleCalendarCard integration={null} />)

    const connectButton = screen.getByRole('button', { name: /connect/i })
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(connectButton).toBeDisabled()
      expect(screen.getByText(/connecting/i)).toBeInTheDocument()
    })
  })

  it('should handle connection error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'Invalid request' }),
    })

    render(<GoogleCalendarCard integration={null} />)

    const connectButton = screen.getByRole('button', { name: /connect/i })
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to initiate connection',
        variant: 'destructive',
      })
    })
  })

  it('should disconnect integration when disconnect button is clicked', async () => {
    // Mock window.confirm
    global.confirm = vi.fn(() => true)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    render(<GoogleCalendarCard integration={mockActiveIntegration} />)

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
    fireEvent.click(disconnectButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/integrations/google-calendar/disconnect', {
        method: 'POST',
      })
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Google Calendar disconnected',
    })
  })

  it('should show loading state during disconnection', async () => {
    // Mock window.confirm
    global.confirm = vi.fn(() => true)

    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<GoogleCalendarCard integration={mockActiveIntegration} />)

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
    fireEvent.click(disconnectButton)

    await waitFor(() => {
      expect(disconnectButton).toBeDisabled()
      expect(screen.getByText(/disconnecting/i)).toBeInTheDocument()
    })
  })

  it('should handle disconnection error', async () => {
    // Mock window.confirm
    global.confirm = vi.fn(() => true)

    mockFetch.mockRejectedValueOnce(new Error('Server error'))

    render(<GoogleCalendarCard integration={mockActiveIntegration} />)

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i })
    fireEvent.click(disconnectButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to disconnect',
        variant: 'destructive',
      })
    })
  })

  it('should show sync status when connected', () => {
    render(<GoogleCalendarCard integration={mockActiveIntegration} />)

    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText(/sync jobs and appointments/i)).toBeInTheDocument()
  })

  it('should show error status when last sync failed', () => {
    const failedIntegration = {
      ...mockActiveIntegration,
      last_error: 'Calendar not found',
    }

    render(<GoogleCalendarCard integration={failedIntegration} />)

    expect(screen.getByText('Calendar not found')).toBeInTheDocument()
  })

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<GoogleCalendarCard integration={null} />)

    const connectButton = screen.getByRole('button', { name: /connect/i })
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to initiate connection',
        variant: 'destructive',
      })
    })
  })

  it('should show calendar settings when connected', () => {
    render(<GoogleCalendarCard integration={mockActiveIntegration} />)

    // The component shows "Account" and external_id field
    expect(screen.getByText(/account/i)).toBeInTheDocument()
  })

  it('should handle missing calendar settings', () => {
    const integrationWithoutSettings = {
      ...mockActiveIntegration,
      settings: {},
    }

    render(<GoogleCalendarCard integration={integrationWithoutSettings} />)
    
    expect(screen.getByText('Connected')).toBeInTheDocument()
    // Should still work without specific calendar settings
  })

  it('should refresh page after successful connection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://accounts.google.com/oauth/authorize?...' }),
    })

    // Mock window.location
    const mockLocation = { href: '', reload: vi.fn() }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    })

    render(<GoogleCalendarCard integration={null} />)

    const connectButton = screen.getByRole('button', { name: /connect/i })
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(mockLocation.href).toBe('https://accounts.google.com/oauth/authorize?...')
    })
  })
})

describe('GoogleCalendarCardErrorBoundary', () => {
  it('should render error boundary wrapper', () => {
    render(
      <GoogleCalendarCardErrorBoundary>
        <div>Test content</div>
      </GoogleCalendarCardErrorBoundary>
    )
    
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })
})