import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LocationList } from '@/components/settings/location-list'
import type { Location } from '@/types/integrations'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const mockLocations: Location[] = [
  {
    id: '1',
    org_id: 'org-1',
    name: 'Main Office',
    code: 'HQ',
    address_line1: '123 Main St',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    phone: '555-1234',
    email: 'main@example.com',
    is_headquarters: true,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '2',
    org_id: 'org-1',
    name: 'Branch Office',
    code: 'BR1',
    address_line1: '456 Oak Ave',
    city: 'Boston',
    state: 'MA',
    zip: '02101',
    phone: '555-5678',
    email: 'branch@example.com',
    is_headquarters: false,
    is_active: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
]

describe('LocationList Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<LocationList locations={mockLocations} />)).not.toThrow()
  })

  it('should display location names', () => {
    render(<LocationList locations={mockLocations} />)
    expect(screen.getByText('Main Office')).toBeInTheDocument()
    expect(screen.getByText('Branch Office')).toBeInTheDocument()
  })

  it('should display location codes', () => {
    render(<LocationList locations={mockLocations} />)
    expect(screen.getByText('HQ')).toBeInTheDocument()
    expect(screen.getByText('BR1')).toBeInTheDocument()
  })

  it('should display location count', () => {
    render(<LocationList locations={mockLocations} />)
    expect(screen.getByText('2 locations configured')).toBeInTheDocument()
  })

  it('should display singular when one location', () => {
    render(<LocationList locations={[mockLocations[0]]} />)
    expect(screen.getByText('1 location configured')).toBeInTheDocument()
  })

  it('should display formatted addresses', () => {
    render(<LocationList locations={mockLocations} />)
    expect(screen.getByText('123 Main St, New York, NY, 10001')).toBeInTheDocument()
    expect(screen.getByText('456 Oak Ave, Boston, MA, 02101')).toBeInTheDocument()
  })

  it('should display phone numbers', () => {
    render(<LocationList locations={mockLocations} />)
    expect(screen.getByText('555-1234')).toBeInTheDocument()
    expect(screen.getByText('555-5678')).toBeInTheDocument()
  })

  it('should display email addresses', () => {
    render(<LocationList locations={mockLocations} />)
    expect(screen.getByText('main@example.com')).toBeInTheDocument()
    expect(screen.getByText('branch@example.com')).toBeInTheDocument()
  })

  it('should display Active badge for active locations', () => {
    render(<LocationList locations={mockLocations} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should display Inactive badge for inactive locations', () => {
    render(<LocationList locations={mockLocations} />)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('should display All Locations title', () => {
    render(<LocationList locations={mockLocations} />)
    expect(screen.getByText('All Locations')).toBeInTheDocument()
  })

  it('should display table headers', () => {
    render(<LocationList locations={mockLocations} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Address')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('should display empty state when no locations', () => {
    render(<LocationList locations={[]} />)
    expect(screen.getByText('No locations')).toBeInTheDocument()
    expect(screen.getByText(/Add your first location/)).toBeInTheDocument()
  })

  it('should render action buttons', () => {
    render(<LocationList locations={mockLocations} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
