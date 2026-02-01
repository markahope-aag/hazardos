import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner, LoadingPage, LoadingCard, LoadingTable } from '@/components/ui/loading-spinner'

describe('LoadingSpinner Component', () => {
  it('should render with default props', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveAttribute('aria-label', 'Loading')
    expect(spinner).toHaveClass('h-8', 'w-8', 'border-2') // md size
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('should render with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />)
    expect(screen.getByRole('status')).toHaveClass('h-4', 'w-4', 'border-2')

    rerender(<LoadingSpinner size="lg" />)
    expect(screen.getByRole('status')).toHaveClass('h-12', 'w-12', 'border-3')

    rerender(<LoadingSpinner size="md" />)
    expect(screen.getByRole('status')).toHaveClass('h-8', 'w-8', 'border-2')
  })

  it('should render with custom label', () => {
    render(<LoadingSpinner label="Processing..." />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-label', 'Processing...')
    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('custom-spinner')
  })

  it('should have proper accessibility attributes', () => {
    render(<LoadingSpinner label="Loading data" />)
    
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-label', 'Loading data')
    
    const srText = screen.getByText('Loading data')
    expect(srText).toHaveClass('sr-only')
  })
})

describe('LoadingPage Component', () => {
  it('should render with default message', () => {
    render(<LoadingPage />)
    
    const container = screen.getByRole('status')
    expect(container).toBeInTheDocument()
    expect(container).toHaveAttribute('aria-busy', 'true')
    expect(container).toHaveAttribute('aria-live', 'polite')
    
    const spinner = screen.getByLabelText('Loading page')
    expect(spinner).toBeInTheDocument()
  })

  it('should render with custom message', () => {
    render(<LoadingPage message="Loading customer data..." />)
    
    const container = screen.getByRole('status')
    expect(container).toBeInTheDocument()
    
    const spinner = screen.getByLabelText('Loading customer data...')
    expect(spinner).toBeInTheDocument()
    
    const message = screen.getByText('Loading customer data...')
    expect(message).toBeInTheDocument()
    expect(message).toHaveAttribute('aria-hidden', 'true')
  })

  it('should not show message text when no message provided', () => {
    render(<LoadingPage />)
    
    // Should only have the spinner label, no additional message text
    expect(screen.queryByText('Loading page')).not.toBeInTheDocument()
  })

  it('should have proper layout classes', () => {
    render(<LoadingPage message="Test message" />)
    
    const container = screen.getByRole('status')
    expect(container).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'min-h-[400px]',
      'gap-4'
    )
  })
})

describe('LoadingCard Component', () => {
  it('should render loading card with skeleton content', () => {
    render(<LoadingCard />)
    
    const card = screen.getByRole('status')
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('aria-busy', 'true')
    expect(card).toHaveAttribute('aria-label', 'Loading content')
    
    const srText = screen.getByText('Loading content')
    expect(srText).toHaveClass('sr-only')
  })

  it('should have proper card styling', () => {
    render(<LoadingCard />)
    
    const card = screen.getByRole('status')
    expect(card).toHaveClass('border', 'rounded-lg', 'p-6')
  })

  it('should have animated skeleton elements', () => {
    render(<LoadingCard />)
    
    const card = screen.getByRole('status')
    const animatedContent = card.querySelector('.animate-pulse')
    expect(animatedContent).toBeInTheDocument()
    expect(animatedContent).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('LoadingTable Component', () => {
  it('should render with default number of rows', () => {
    render(<LoadingTable />)
    
    const table = screen.getByRole('status')
    expect(table).toBeInTheDocument()
    expect(table).toHaveAttribute('aria-busy', 'true')
    expect(table).toHaveAttribute('aria-label', 'Loading table data')
    
    const srText = screen.getByText('Loading table data')
    expect(srText).toHaveClass('sr-only')
  })

  it('should render with custom number of rows', () => {
    render(<LoadingTable rows={3} />)
    
    const table = screen.getByRole('status')
    expect(table).toBeInTheDocument()
    
    // Should have header + 3 rows
    const rows = table.querySelectorAll('.p-4.border-b')
    expect(rows).toHaveLength(4) // 1 header + 3 data rows
  })

  it('should have proper table styling', () => {
    render(<LoadingTable />)
    
    const table = screen.getByRole('status')
    expect(table).toHaveClass('border', 'rounded-lg', 'overflow-hidden')
  })

  it('should have animated skeleton elements', () => {
    render(<LoadingTable rows={2} />)
    
    const table = screen.getByRole('status')
    const animatedElements = table.querySelectorAll('.animate-pulse')
    expect(animatedElements.length).toBeGreaterThan(0)
    
    animatedElements.forEach(element => {
      expect(element).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('should handle zero rows', () => {
    render(<LoadingTable rows={0} />)
    
    const table = screen.getByRole('status')
    expect(table).toBeInTheDocument()
    
    // Should only have header row
    const rows = table.querySelectorAll('.p-4.border-b')
    expect(rows).toHaveLength(1) // Just the header
  })

  it('should handle large number of rows', () => {
    render(<LoadingTable rows={10} />)
    
    const table = screen.getByRole('status')
    const rows = table.querySelectorAll('.p-4.border-b')
    expect(rows).toHaveLength(11) // 1 header + 10 data rows
  })
})