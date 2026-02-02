import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-123' } } }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => {
          if (table === 'profiles') {
            return {
              single: () => Promise.resolve({ data: { organization_id: 'org-123' } }),
            }
          }
          if (table === 'organization_integrations') {
            return Promise.resolve({
              data: [
                { id: 'int-1', integration_type: 'quickbooks', is_active: true },
                { id: 'int-2', integration_type: 'mailchimp', is_active: false },
              ],
            })
          }
          if (table === 'integration_sync_log') {
            return {
              order: () => ({
                limit: () => Promise.resolve({ data: [] }),
              }),
            }
          }
          return Promise.resolve({ data: null })
        },
      }),
    }),
  }),
}))

// Mock integration card components
vi.mock('@/app/(dashboard)/settings/integrations/quickbooks-card', () => ({
  QuickBooksCard: ({ integration }: { integration: unknown }) => (
    <div data-testid="quickbooks-card">QuickBooks {integration ? 'Connected' : 'Not Connected'}</div>
  ),
}))

vi.mock('@/components/integrations/mailchimp-card', () => ({
  MailchimpCard: ({ integration }: { integration: unknown }) => (
    <div data-testid="mailchimp-card">Mailchimp {integration ? 'Connected' : 'Not Connected'}</div>
  ),
}))

vi.mock('@/components/integrations/hubspot-card', () => ({
  HubSpotCard: () => <div data-testid="hubspot-card">HubSpot</div>,
}))

vi.mock('@/components/integrations/google-calendar-card', () => ({
  GoogleCalendarCard: () => <div data-testid="google-calendar-card">Google Calendar</div>,
}))

vi.mock('@/components/integrations/outlook-calendar-card', () => ({
  OutlookCalendarCard: () => <div data-testid="outlook-calendar-card">Outlook Calendar</div>,
}))

vi.mock('@/app/(dashboard)/settings/integrations/sync-history-table', () => ({
  SyncHistoryTable: () => <div data-testid="sync-history-table">Sync History</div>,
}))

// Import after mocks
import IntegrationsPage from '@/app/(dashboard)/settings/integrations/page'

describe('IntegrationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await IntegrationsPage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await IntegrationsPage()
    render(page)

    expect(screen.getByText('Integrations')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await IntegrationsPage()
    render(page)

    expect(screen.getByText(/connect hazardos with your accounting/i)).toBeInTheDocument()
  })

  it('displays accounting section', async () => {
    const page = await IntegrationsPage()
    render(page)

    expect(screen.getByText('Accounting')).toBeInTheDocument()
  })

  it('renders QuickBooks card', async () => {
    const page = await IntegrationsPage()
    render(page)

    expect(screen.getByTestId('quickbooks-card')).toBeInTheDocument()
  })

  it('displays marketing section', async () => {
    const page = await IntegrationsPage()
    render(page)

    expect(screen.getByText('Marketing')).toBeInTheDocument()
  })

  it('renders Mailchimp card', async () => {
    const page = await IntegrationsPage()
    render(page)

    expect(screen.getByTestId('mailchimp-card')).toBeInTheDocument()
  })

  it('renders HubSpot card', async () => {
    const page = await IntegrationsPage()
    render(page)

    expect(screen.getByTestId('hubspot-card')).toBeInTheDocument()
  })

  it('displays calendar section', async () => {
    const page = await IntegrationsPage()
    render(page)

    expect(screen.getByText('Calendar')).toBeInTheDocument()
  })

  it('renders Google Calendar card', async () => {
    const page = await IntegrationsPage()
    render(page)

    expect(screen.getByTestId('google-calendar-card')).toBeInTheDocument()
  })

  it('renders Outlook Calendar card', async () => {
    const page = await IntegrationsPage()
    render(page)

    expect(screen.getByTestId('outlook-calendar-card')).toBeInTheDocument()
  })
})
