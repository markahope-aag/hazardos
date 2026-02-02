import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import PricingSettingsPage from '@/app/(dashboard)/settings/pricing/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock fetch to return loading state
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('PricingSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch to return loading state initially
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        labor_rates: [],
        equipment_rates: [],
        material_costs: [],
        disposal_fees: [],
        travel_rates: [],
        settings: null,
      }),
    })
  })

  it('renders without crashing', () => {
    expect(() => render(<PricingSettingsPage />)).not.toThrow()
  })

  it('displays loading state initially', () => {
    // Set fetch to never resolve
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<PricingSettingsPage />)
    // Should show spinner during loading
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('displays page heading after loading', async () => {
    render(<PricingSettingsPage />)
    expect(await screen.findByText('Pricing Settings')).toBeInTheDocument()
  })

  it('displays page description', async () => {
    render(<PricingSettingsPage />)
    expect(await screen.findByText('Configure rates and costs for estimates')).toBeInTheDocument()
  })

  it('displays back link to settings', async () => {
    render(<PricingSettingsPage />)
    const links = await screen.findAllByRole('link')
    const backLink = links.find(link => link.getAttribute('href') === '/settings')
    expect(backLink).toBeInTheDocument()
  })

  it('displays general tab by default', async () => {
    render(<PricingSettingsPage />)
    expect(await screen.findByText('General Pricing Settings')).toBeInTheDocument()
  })

  it('displays tab options', async () => {
    render(<PricingSettingsPage />)
    // Wait for page to load
    await screen.findByText('Pricing Settings')

    // Check tabs exist (by finding tab triggers)
    expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /labor/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /equipment/i })).toBeInTheDocument()
  })

  it('displays save settings button', async () => {
    render(<PricingSettingsPage />)
    expect(await screen.findByRole('button', { name: /save settings/i })).toBeInTheDocument()
  })
})
