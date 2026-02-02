import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CustomerInfoCard from '@/components/customers/customer-info-card'
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
  address_line2: 'Suite 100',
  city: 'New York',
  state: 'NY',
  zip: '10001',
  status: 'customer',
  source: 'referral',
  marketing_consent: true,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

describe('CustomerInfoCard Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<CustomerInfoCard customer={mockCustomer} />)).not.toThrow()
  })

  it('should display email address', () => {
    render(<CustomerInfoCard customer={mockCustomer} />)
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
  })

  it('should display phone number', () => {
    render(<CustomerInfoCard customer={mockCustomer} />)
    expect(screen.getByText('555-123-4567')).toBeInTheDocument()
  })

  it('should display company name', () => {
    render(<CustomerInfoCard customer={mockCustomer} />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('should display customer since date', () => {
    render(<CustomerInfoCard customer={mockCustomer} />)
    expect(screen.getByText(/Customer since January 15, 2024/)).toBeInTheDocument()
  })

  it('should display full address', () => {
    render(<CustomerInfoCard customer={mockCustomer} />)
    expect(screen.getByText(/123 Main Street/)).toBeInTheDocument()
    expect(screen.getByText(/Suite 100/)).toBeInTheDocument()
    expect(screen.getByText(/New York, NY, 10001/)).toBeInTheDocument()
  })

  it('should display customer status', () => {
    render(<CustomerInfoCard customer={mockCustomer} />)
    expect(screen.getByText('Customer')).toBeInTheDocument()
  })

  it('should display source with capitalized first letter', () => {
    render(<CustomerInfoCard customer={mockCustomer} />)
    expect(screen.getByText('Referral')).toBeInTheDocument()
  })

  it('should display marketing consent indicator when consented', () => {
    render(<CustomerInfoCard customer={mockCustomer} />)
    expect(screen.getByText(/Consented to marketing communications/)).toBeInTheDocument()
  })

  it('should not display marketing consent when not consented', () => {
    const customerWithoutConsent = { ...mockCustomer, marketing_consent: false }
    render(<CustomerInfoCard customer={customerWithoutConsent} />)
    expect(screen.queryByText(/Consented to marketing communications/)).not.toBeInTheDocument()
  })

  it('should display "No contact information available" when no email and phone', () => {
    const customerNoContact = { ...mockCustomer, email: null, phone: null }
    render(<CustomerInfoCard customer={customerNoContact} />)
    expect(screen.getByText('No contact information available')).toBeInTheDocument()
  })

  it('should display "No address on file" when no address', () => {
    const customerNoAddress = {
      ...mockCustomer,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      zip: null,
    }
    render(<CustomerInfoCard customer={customerNoAddress} />)
    expect(screen.getByText('No address on file')).toBeInTheDocument()
  })

  it('should display "Unknown" when source is null', () => {
    const customerNoSource = { ...mockCustomer, source: null }
    render(<CustomerInfoCard customer={customerNoSource} />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('should render email as mailto link', () => {
    render(<CustomerInfoCard customer={mockCustomer} />)
    const emailLink = screen.getByRole('link', { name: 'john.doe@example.com' })
    expect(emailLink).toHaveAttribute('href', 'mailto:john.doe@example.com')
  })

  it('should render phone as tel link', () => {
    render(<CustomerInfoCard customer={mockCustomer} />)
    const phoneLink = screen.getByRole('link', { name: '555-123-4567' })
    expect(phoneLink).toHaveAttribute('href', 'tel:555-123-4567')
  })

  it('should render Contact Information card header', () => {
    render(<CustomerInfoCard customer={mockCustomer} />)
    expect(screen.getByText('Contact Information')).toBeInTheDocument()
  })

  it('should render Address & Details card header', () => {
    render(<CustomerInfoCard customer={mockCustomer} />)
    expect(screen.getByText('Address & Details')).toBeInTheDocument()
  })

  it('should handle partial address', () => {
    const customerPartialAddress = {
      ...mockCustomer,
      address_line1: '456 Oak Ave',
      address_line2: null,
      city: 'Boston',
      state: null,
      zip: '02101',
    }
    render(<CustomerInfoCard customer={customerPartialAddress} />)
    expect(screen.getByText(/456 Oak Ave/)).toBeInTheDocument()
    expect(screen.getByText(/Boston, 02101/)).toBeInTheDocument()
  })
})
