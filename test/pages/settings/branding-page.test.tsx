import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-123' } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { organization_id: 'org-123' } }),
        }),
      }),
    }),
  }),
}))

// Mock WhiteLabelService
vi.mock('@/lib/services/white-label-service', () => ({
  WhiteLabelService: {
    getConfig: () => Promise.resolve({
      enabled: true,
      config: {
        company_name: 'Acme Corp',
        primary_color: '#3b82f6',
        logo_url: 'https://example.com/logo.png',
        favicon_url: 'https://example.com/favicon.ico',
      },
    }),
    listDomains: () => Promise.resolve([
      { id: 'domain-1', domain: 'app.acme.com', is_verified: true },
    ]),
  },
}))

// Mock BrandingForm component
vi.mock('@/components/settings/branding-form', () => ({
  BrandingForm: ({ enabled, config, domains }: { enabled: boolean; config: unknown; domains: unknown[] }) => (
    <div data-testid="branding-form">
      Enabled: {enabled ? 'Yes' : 'No'}, Domains: {Array.isArray(domains) ? domains.length : 0}
    </div>
  ),
}))

// Import after mocks
import BrandingPage from '@/app/(dashboard)/settings/branding/page'

describe('BrandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await BrandingPage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await BrandingPage()
    render(page)

    expect(screen.getByText('Branding')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await BrandingPage()
    render(page)

    expect(screen.getByText(/customize the look and feel/i)).toBeInTheDocument()
  })

  it('renders branding form', async () => {
    const page = await BrandingPage()
    render(page)

    expect(screen.getByTestId('branding-form')).toBeInTheDocument()
  })

  it('passes enabled status to form', async () => {
    const page = await BrandingPage()
    render(page)

    expect(screen.getByText(/Enabled: Yes/)).toBeInTheDocument()
  })

  it('passes domains to form', async () => {
    const page = await BrandingPage()
    render(page)

    expect(screen.getByText(/Domains: 1/)).toBeInTheDocument()
  })
})
