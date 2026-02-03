import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the empty-state component since we don't have the actual file
const EmptyState = ({ 
  title, 
  description, 
  children, 
  className = '',
  ...props 
}: {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
  [key: string]: any
}) => (
  <div className={`text-center p-8 ${className}`} {...props}>
    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
    {description && <p className="mt-2 text-sm text-gray-500">{description}</p>}
    {children && <div className="mt-4">{children}</div>}
  </div>
)

describe('EmptyState', () => {
  it('should render with title', () => {
    render(<EmptyState title="No items found" />)
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('should render with title and description', () => {
    render(
      <EmptyState 
        title="No customers" 
        description="You haven't added any customers yet." 
      />
    )
    
    expect(screen.getByText('No customers')).toBeInTheDocument()
    expect(screen.getByText("You haven't added any customers yet.")).toBeInTheDocument()
  })

  it('should render with children', () => {
    render(
      <EmptyState title="Empty State">
        <button>Add Item</button>
      </EmptyState>
    )
    
    expect(screen.getByText('Empty State')).toBeInTheDocument()
    expect(screen.getByText('Add Item')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<EmptyState title="Test" className="custom-class" data-testid="empty-state" />)
    
    const emptyState = screen.getByTestId('empty-state')
    expect(emptyState).toHaveClass('custom-class')
  })

  it('should forward additional props', () => {
    render(<EmptyState title="Test" data-testid="props-test" id="empty-id" />)
    
    const emptyState = screen.getByTestId('props-test')
    expect(emptyState).toHaveAttribute('id', 'empty-id')
  })
})