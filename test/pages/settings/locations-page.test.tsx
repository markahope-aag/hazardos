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

// Mock LocationService
vi.mock('@/lib/services/location-service', () => ({
  LocationService: {
    list: () => Promise.resolve([
      {
        id: 'loc-1',
        name: 'Main Office',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        is_primary: true,
      },
      {
        id: 'loc-2',
        name: 'Branch Office',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        is_primary: false,
      },
    ]),
  },
}))

// Mock LocationList component
vi.mock('@/components/settings/location-list', () => ({
  LocationList: ({ locations }: { locations: unknown[] }) => (
    <div data-testid="location-list">
      Locations: {Array.isArray(locations) ? locations.length : 0}
    </div>
  ),
}))

// Import after mocks
import LocationsPage from '@/app/(dashboard)/settings/locations/page'

describe('LocationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await LocationsPage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await LocationsPage()
    render(page)

    expect(screen.getByText('Locations')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await LocationsPage()
    render(page)

    expect(screen.getByText('Manage multiple office locations and service areas')).toBeInTheDocument()
  })

  it('displays add location button', async () => {
    const page = await LocationsPage()
    render(page)

    expect(screen.getByRole('link', { name: /add location/i })).toBeInTheDocument()
  })

  it('links to new location page', async () => {
    const page = await LocationsPage()
    render(page)

    const link = screen.getByRole('link', { name: /add location/i })
    expect(link).toHaveAttribute('href', '/settings/locations/new')
  })

  it('renders location list', async () => {
    const page = await LocationsPage()
    render(page)

    expect(screen.getByTestId('location-list')).toBeInTheDocument()
  })

  it('passes locations to list component', async () => {
    const page = await LocationsPage()
    render(page)

    expect(screen.getByText(/Locations: 2/)).toBeInTheDocument()
  })
})
