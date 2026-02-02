import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrandingForm } from '@/components/settings/branding-form'
import type { WhiteLabelConfig, CustomDomain } from '@/types/integrations'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn()

const defaultConfig: WhiteLabelConfig = {
  company_name: '',
  logo_url: '',
  favicon_url: '',
  primary_color: '#3b82f6',
  secondary_color: '#1e40af',
  hide_powered_by: false,
}

const mockDomains: CustomDomain[] = [
  {
    id: 'domain-1',
    organization_id: 'org-1',
    domain: 'app.example.com',
    is_verified: true,
    ssl_status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'domain-2',
    organization_id: 'org-1',
    domain: 'staging.example.com',
    is_verified: false,
    ssl_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

describe('BrandingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
  })

  it('renders White Label card', () => {
    render(<BrandingForm enabled={false} config={defaultConfig} domains={[]} />)

    expect(screen.getByText('White Label')).toBeInTheDocument()
  })

  it('renders white label toggle switch', () => {
    render(<BrandingForm enabled={false} config={defaultConfig} domains={[]} />)

    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('shows branding options when enabled', () => {
    render(<BrandingForm enabled={true} config={defaultConfig} domains={[]} />)

    expect(screen.getByText('Branding')).toBeInTheDocument()
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/logo url/i)).toBeInTheDocument()
  })

  it('hides branding options when disabled', () => {
    render(<BrandingForm enabled={false} config={defaultConfig} domains={[]} />)

    expect(screen.queryByText('Branding')).not.toBeInTheDocument()
  })

  it('shows color pickers when enabled', () => {
    render(<BrandingForm enabled={true} config={defaultConfig} domains={[]} />)

    expect(screen.getByLabelText(/primary color/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/secondary color/i)).toBeInTheDocument()
  })

  it('shows hide powered by option when enabled', () => {
    render(<BrandingForm enabled={true} config={defaultConfig} domains={[]} />)

    expect(screen.getByLabelText(/hide "powered by hazardos"/i)).toBeInTheDocument()
  })

  it('shows Custom Domains section when enabled', () => {
    render(<BrandingForm enabled={true} config={defaultConfig} domains={[]} />)

    expect(screen.getByText('Custom Domains')).toBeInTheDocument()
  })

  it('shows Add Domain button', () => {
    render(<BrandingForm enabled={true} config={defaultConfig} domains={[]} />)

    expect(screen.getByRole('button', { name: /add domain/i })).toBeInTheDocument()
  })

  it('renders domain list', () => {
    render(<BrandingForm enabled={true} config={defaultConfig} domains={mockDomains} />)

    expect(screen.getByText('app.example.com')).toBeInTheDocument()
    expect(screen.getByText('staging.example.com')).toBeInTheDocument()
  })

  it('shows Verified badge for verified domain', () => {
    render(<BrandingForm enabled={true} config={defaultConfig} domains={mockDomains} />)

    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('shows Pending Verification badge for unverified domain', () => {
    render(<BrandingForm enabled={true} config={defaultConfig} domains={mockDomains} />)

    expect(screen.getByText('Pending Verification')).toBeInTheDocument()
  })

  it('shows Verify button for unverified domain', () => {
    render(<BrandingForm enabled={true} config={defaultConfig} domains={mockDomains} />)

    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument()
  })

  it('shows SSL status for verified domain', () => {
    render(<BrandingForm enabled={true} config={defaultConfig} domains={mockDomains} />)

    expect(screen.getByText('SSL: active')).toBeInTheDocument()
  })

  it('renders Save Changes button', () => {
    render(<BrandingForm enabled={true} config={defaultConfig} domains={[]} />)

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('populates form with existing config values', () => {
    const config: WhiteLabelConfig = {
      company_name: 'My Company',
      logo_url: 'https://example.com/logo.png',
      favicon_url: 'https://example.com/favicon.ico',
      primary_color: '#ff0000',
      secondary_color: '#00ff00',
      hide_powered_by: true,
    }

    render(<BrandingForm enabled={true} config={config} domains={[]} />)

    expect(screen.getByDisplayValue('My Company')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com/logo.png')).toBeInTheDocument()
  })

  it('toggles white label on/off', async () => {
    const user = userEvent.setup()
    render(<BrandingForm enabled={false} config={defaultConfig} domains={[]} />)

    const toggle = screen.getByRole('switch')
    await user.click(toggle)

    // After toggling, branding options should be visible
    expect(screen.getByText('Branding')).toBeInTheDocument()
  })
})
