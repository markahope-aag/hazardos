import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileText as _FileText, Users, Calendar as _Calendar } from 'lucide-react'
import {
  EmptyState,
  NoCustomersState,
  NoJobsState,
  NoInvoicesState,
  NoSearchResultsState,
} from '@/components/ui/empty-state'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('EmptyState Component', () => {
  it('should render with basic props', () => {
    render(
      <EmptyState
        title="No data found"
        description="There is no data to display at this time."
      />
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('No data found')).toBeInTheDocument()
    expect(screen.getByText('There is no data to display at this time.')).toBeInTheDocument()
  })

  it('should render with custom icon', () => {
    render(
      <EmptyState
        icon={Users}
        title="No users"
        description="Add your first user to get started."
      />
    )

    const container = screen.getByRole('status')
    expect(container).toBeInTheDocument()
    
    // Icon should be rendered (Users icon)
    const iconContainer = container.querySelector('.p-4.bg-muted.rounded-full')
    expect(iconContainer).toBeInTheDocument()
  })

  it('should render with default FileText icon when no icon provided', () => {
    render(
      <EmptyState
        title="No files"
        description="Upload your first file."
      />
    )

    const container = screen.getByRole('status')
    const iconContainer = container.querySelector('.p-4.bg-muted.rounded-full')
    expect(iconContainer).toBeInTheDocument()
  })

  it('should render with action button (onClick)', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <EmptyState
        title="No items"
        description="Create your first item."
        action={{ label: 'Create Item', onClick: handleClick }}
      />
    )

    const button = screen.getByRole('button', { name: /create item/i })
    expect(button).toBeInTheDocument()
    
    await user.click(button)
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('should render with action link (href)', () => {
    render(
      <EmptyState
        title="No items"
        description="Create your first item."
        action={{ label: 'Create Item', href: '/items/new' }}
      />
    )

    const link = screen.getByRole('link', { name: /create item/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/items/new')
  })

  it('should render without action button', () => {
    render(
      <EmptyState
        title="No results"
        description="Try adjusting your search criteria."
      />
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(
      <EmptyState
        title="Test"
        description="Test description"
        className="custom-empty-state"
      />
    )

    const container = screen.getByRole('status')
    expect(container).toHaveClass('custom-empty-state')
  })

  it('should have proper accessibility attributes', () => {
    render(
      <EmptyState
        title="No data available"
        description="Please check back later."
      />
    )

    const container = screen.getByRole('status')
    expect(container).toHaveAttribute('aria-label', 'No data available')
  })

  it('should have proper semantic structure', () => {
    render(
      <EmptyState
        title="Empty State Title"
        description="This is the description text."
      />
    )

    const title = screen.getByRole('heading', { level: 3 })
    expect(title).toHaveTextContent('Empty State Title')
    expect(title).toHaveClass('text-lg', 'font-semibold')

    const description = screen.getByText('This is the description text.')
    expect(description).toHaveClass('text-muted-foreground')
  })
})

describe('NoCustomersState Component', () => {
  it('should render customers empty state', () => {
    render(<NoCustomersState />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('No customers yet')).toBeInTheDocument()
    expect(screen.getByText('Get started by adding your first customer to the system.')).toBeInTheDocument()
    
    const link = screen.getByRole('link', { name: /add customer/i })
    expect(link).toHaveAttribute('href', '/customers/new')
  })

  it('should have proper accessibility', () => {
    render(<NoCustomersState />)

    const container = screen.getByRole('status')
    expect(container).toHaveAttribute('aria-label', 'No customers yet')
  })
})

describe('NoJobsState Component', () => {
  it('should render jobs empty state', () => {
    render(<NoJobsState />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('No jobs scheduled')).toBeInTheDocument()
    expect(screen.getByText('Create your first job to start tracking work.')).toBeInTheDocument()
    
    const link = screen.getByRole('link', { name: /create job/i })
    expect(link).toHaveAttribute('href', '/jobs/new')
  })
})

describe('NoInvoicesState Component', () => {
  it('should render invoices empty state', () => {
    render(<NoInvoicesState />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('No invoices yet')).toBeInTheDocument()
    expect(screen.getByText('Create an invoice after completing a job.')).toBeInTheDocument()
    
    const link = screen.getByRole('link', { name: /create invoice/i })
    expect(link).toHaveAttribute('href', '/invoices/new')
  })
})

describe('NoSearchResultsState Component', () => {
  it('should render search results empty state', () => {
    const query = 'test search query'
    render(<NoSearchResultsState query={query} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('No results found')).toBeInTheDocument()
    expect(screen.getByText(`We couldn't find anything matching "${query}". Try a different search term.`)).toBeInTheDocument()
  })

  it('should handle empty query', () => {
    render(<NoSearchResultsState query="" />)

    expect(screen.getByText('We couldn\'t find anything matching "". Try a different search term.')).toBeInTheDocument()
  })

  it('should handle special characters in query', () => {
    const query = 'test & "special" <chars>'
    render(<NoSearchResultsState query={query} />)

    expect(screen.getByText(`We couldn't find anything matching "${query}". Try a different search term.`)).toBeInTheDocument()
  })

  it('should not have action button', () => {
    render(<NoSearchResultsState query="test" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})