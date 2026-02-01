import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomerFilters from '@/components/customers/CustomerFilters'

describe('CustomerFilters', () => {
  const mockOnStatusChange = vi.fn()
  const mockOnSourceChange = vi.fn()
  const mockOnClearFilters = vi.fn()

  const defaultProps = {
    status: 'all' as const,
    source: 'all' as const,
    onStatusChange: mockOnStatusChange,
    onSourceChange: mockOnSourceChange,
    onClearFilters: mockOnClearFilters,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render status and source filter buttons', () => {
    render(<CustomerFilters {...defaultProps} />)

    expect(screen.getByText('All Statuses')).toBeInTheDocument()
    expect(screen.getByText('All Sources')).toBeInTheDocument()
  })

  it('should not show clear filters button when no filters active', () => {
    render(<CustomerFilters {...defaultProps} />)

    expect(screen.queryByText('Clear all')).not.toBeInTheDocument()
  })

  it('should show active status filter as badge', () => {
    render(
      <CustomerFilters
        {...defaultProps}
        status="active"
      />
    )

    expect(screen.getByText(/Status:/)).toBeInTheDocument()
  })

  it('should show active source filter as badge', () => {
    render(
      <CustomerFilters
        {...defaultProps}
        source="referral"
      />
    )

    expect(screen.getByText(/Source:/)).toBeInTheDocument()
  })

  it('should show clear all button when filters are active', () => {
    render(
      <CustomerFilters
        {...defaultProps}
        status="active"
        source="referral"
      />
    )

    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('should call onStatusChange when status filter clicked', async () => {
    render(<CustomerFilters {...defaultProps} />)

    const statusButton = screen.getByText('All Statuses')
    await userEvent.click(statusButton)

    const activeOption = await screen.findByText('Active')
    await userEvent.click(activeOption)

    expect(mockOnStatusChange).toHaveBeenCalledWith('active')
  })

  it('should call onSourceChange when source filter clicked', async () => {
    render(<CustomerFilters {...defaultProps} />)

    const sourceButton = screen.getByText('All Sources')
    await userEvent.click(sourceButton)

    const referralOption = await screen.findByText('Referral')
    await userEvent.click(referralOption)

    expect(mockOnSourceChange).toHaveBeenCalledWith('referral')
  })

  it('should call onClearFilters when clear all button clicked', async () => {
    render(
      <CustomerFilters
        {...defaultProps}
        status="active"
        source="referral"
      />
    )

    const clearButton = screen.getByText('Clear all')
    await userEvent.click(clearButton)

    expect(mockOnClearFilters).toHaveBeenCalled()
  })

  it('should remove status filter when X button clicked on status badge', async () => {
    render(
      <CustomerFilters
        {...defaultProps}
        status="active"
      />
    )

    const statusBadge = screen.getByText(/Status:/).closest('span')
    const removeButton = statusBadge?.querySelector('button')

    if (removeButton) {
      await userEvent.click(removeButton)
      expect(mockOnStatusChange).toHaveBeenCalledWith('all')
    }
  })

  it('should remove source filter when X button clicked on source badge', async () => {
    render(
      <CustomerFilters
        {...defaultProps}
        source="referral"
      />
    )

    const sourceBadge = screen.getByText(/Source:/).closest('span')
    const removeButton = sourceBadge?.querySelector('button')

    if (removeButton) {
      await userEvent.click(removeButton)
      expect(mockOnSourceChange).toHaveBeenCalledWith('all')
    }
  })

  it('should apply custom className', () => {
    const { container } = render(
      <CustomerFilters {...defaultProps} className="custom-class" />
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('custom-class')
  })
})
