import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CustomerActivityFeed from '@/components/customers/customer-activity-feed'
import type { Customer } from '@/types/database'

// The component now just delegates to EntityActivityFeed, which fetches
// `/api/activity-log`. Stub fetch so the test doesn't try a real network
// call and the loading→rendered transition can be asserted.
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ activity: [] }),
}) as unknown as typeof fetch

const mockCustomer: Customer = {
  id: '1',
  organization_id: 'org-1',
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
} as unknown as Customer

describe('CustomerActivityFeed Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<CustomerActivityFeed customer={mockCustomer} />)).not.toThrow()
  })

  it('should display Activity title', () => {
    render(<CustomerActivityFeed customer={mockCustomer} />)
    expect(screen.getByText('Activity')).toBeInTheDocument()
  })
})
