import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CustomerActivityFeed from '@/components/customers/customer-activity-feed'
import type { Customer } from '@/types/database'

const mockCustomer: Customer = {
  id: '1',
  org_id: 'org-1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '555-123-4567',
  company_name: 'Acme Corp',
  address_line1: '123 Main Street',
  address_line2: null,
  city: 'New York',
  state: 'NY',
  zip: '10001',
  status: 'customer',
  source: 'referral',
  marketing_consent: true,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

describe('CustomerActivityFeed Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<CustomerActivityFeed customer={mockCustomer} />)).not.toThrow()
  })

  it('should display Activity title', () => {
    render(<CustomerActivityFeed customer={mockCustomer} />)
    expect(screen.getByText('Activity')).toBeInTheDocument()
  })

  it('should display customer record created activity', () => {
    render(<CustomerActivityFeed customer={mockCustomer} />)
    expect(screen.getByText('Customer record created')).toBeInTheDocument()
  })

  it('should display creation timestamp', () => {
    render(<CustomerActivityFeed customer={mockCustomer} />)
    // Should show formatted date like "Jan 15, 2024 at 10:00 AM"
    expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument()
  })

  it('should display by System', () => {
    render(<CustomerActivityFeed customer={mockCustomer} />)
    expect(screen.getByText(/by System/)).toBeInTheDocument()
  })

  it('should display future activity message', () => {
    render(<CustomerActivityFeed customer={mockCustomer} />)
    expect(screen.getByText('Future activity will appear here')).toBeInTheDocument()
  })

  it('should display activity types hint', () => {
    render(<CustomerActivityFeed customer={mockCustomer} />)
    expect(screen.getByText('Surveys, estimates, jobs, and communications')).toBeInTheDocument()
  })

  it('should render activity icon', () => {
    const { container } = render(<CustomerActivityFeed customer={mockCustomer} />)
    // Should have SVG icons
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })

  it('should render inside a Card component', () => {
    const { container } = render(<CustomerActivityFeed customer={mockCustomer} />)
    // Card renders with specific structure
    expect(container.querySelector('[class*="rounded-"]')).toBeInTheDocument()
  })

  it('should handle different creation dates', () => {
    const customer = { ...mockCustomer, created_at: '2023-06-20T15:30:00Z' }
    render(<CustomerActivityFeed customer={customer} />)
    expect(screen.getByText(/Jun 20, 2023/)).toBeInTheDocument()
  })
})
