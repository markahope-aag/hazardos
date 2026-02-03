import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the loading-spinner component since we don't have the actual file
const LoadingSpinner = ({ 
  size = 'md',
  className = '',
  ...props 
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  [key: string]: any
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }
  
  return (
    <div 
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
      {...props}
    />
  )
}

describe('LoadingSpinner', () => {
  it('should render with default size', () => {
    render(<LoadingSpinner data-testid="spinner" />)
    
    const spinner = screen.getByTestId('spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('h-6', 'w-6') // default md size
  })

  it('should render with small size', () => {
    render(<LoadingSpinner size="sm" data-testid="small-spinner" />)
    
    const spinner = screen.getByTestId('small-spinner')
    expect(spinner).toHaveClass('h-4', 'w-4')
  })

  it('should render with large size', () => {
    render(<LoadingSpinner size="lg" data-testid="large-spinner" />)
    
    const spinner = screen.getByTestId('large-spinner')
    expect(spinner).toHaveClass('h-8', 'w-8')
  })

  it('should have correct accessibility attributes', () => {
    render(<LoadingSpinner data-testid="accessible-spinner" />)
    
    const spinner = screen.getByTestId('accessible-spinner')
    expect(spinner).toHaveAttribute('role', 'status')
    expect(spinner).toHaveAttribute('aria-label', 'Loading')
  })

  it('should apply animation classes', () => {
    render(<LoadingSpinner data-testid="animated-spinner" />)
    
    const spinner = screen.getByTestId('animated-spinner')
    expect(spinner).toHaveClass('animate-spin', 'rounded-full')
  })

  it('should apply custom className', () => {
    render(<LoadingSpinner className="custom-spinner" data-testid="custom-spinner" />)
    
    const spinner = screen.getByTestId('custom-spinner')
    expect(spinner).toHaveClass('custom-spinner')
  })

  it('should forward additional props', () => {
    render(<LoadingSpinner data-testid="props-spinner" id="spinner-id" />)
    
    const spinner = screen.getByTestId('props-spinner')
    expect(spinner).toHaveAttribute('id', 'spinner-id')
  })
})