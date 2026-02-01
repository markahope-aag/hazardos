import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CustomerStatusBadge from '@/components/customers/CustomerStatusBadge'
import type { CustomerStatus } from '@/types/database'

describe('CustomerStatusBadge Component', () => {
  it('should render lead status with correct styling', () => {
    render(<CustomerStatusBadge status="lead" />)

    const badge = screen.getByText('Lead')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('should render prospect status with correct styling', () => {
    render(<CustomerStatusBadge status="prospect" />)

    const badge = screen.getByText('Prospect')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('should render customer status with correct styling', () => {
    render(<CustomerStatusBadge status="customer" />)

    const badge = screen.getByText('Customer')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('should render inactive status with correct styling', () => {
    render(<CustomerStatusBadge status="inactive" />)

    const badge = screen.getByText('Inactive')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-600')
  })

  it('should handle unknown status gracefully', () => {
    render(<CustomerStatusBadge status={"unknown" as unknown as CustomerStatus} />)

    // The component displays the raw status value for unknown statuses
    const badge = screen.getByText('unknown')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-600')
  })

  it('should accept custom className', () => {
    render(<CustomerStatusBadge status="lead" className="custom-class" />)

    const badge = screen.getByText('Lead')
    expect(badge).toHaveClass('custom-class')
  })

  it('should have rounded corners for modern design', () => {
    render(<CustomerStatusBadge status="lead" />)

    const badge = screen.getByText('Lead')
    expect(badge).toHaveClass('rounded-full')
  })

  it('should display status text in proper case', () => {
    const statuses = [
      { status: 'lead' as const, expected: 'Lead' },
      { status: 'prospect' as const, expected: 'Prospect' },
      { status: 'customer' as const, expected: 'Customer' },
      { status: 'inactive' as const, expected: 'Inactive' }
    ]

    statuses.forEach(({ status, expected }) => {
      const { unmount } = render(<CustomerStatusBadge status={status} />)
      expect(screen.getByText(expected)).toBeInTheDocument()
      unmount()
    })
  })

  it('should have hover state styling', () => {
    render(<CustomerStatusBadge status="lead" />)

    const badge = screen.getByText('Lead')
    expect(badge).toHaveClass('hover:bg-blue-100')
  })

  it('should have proper text sizing', () => {
    render(<CustomerStatusBadge status="customer" />)

    const badge = screen.getByText('Customer')
    expect(badge).toHaveClass('text-xs')
  })
})
