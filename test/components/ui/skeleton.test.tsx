import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<Skeleton />)).not.toThrow()
  })

  it('should render as a div', () => {
    render(<Skeleton data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton.tagName).toBe('DIV')
  })

  it('should have animate-pulse class', () => {
    render(<Skeleton data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('animate-pulse')
  })

  it('should have rounded-md class', () => {
    render(<Skeleton data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-md')
  })

  it('should have bg-muted class', () => {
    render(<Skeleton data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('bg-muted')
  })

  it('should accept custom className', () => {
    render(<Skeleton className="w-32 h-4" data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('w-32')
    expect(skeleton).toHaveClass('h-4')
  })

  it('should merge custom className with default classes', () => {
    render(<Skeleton className="custom-class" data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('animate-pulse')
    expect(skeleton).toHaveClass('rounded-md')
    expect(skeleton).toHaveClass('bg-muted')
    expect(skeleton).toHaveClass('custom-class')
  })

  it('should accept standard div props', () => {
    render(<Skeleton data-testid="skeleton" aria-hidden="true" role="presentation" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveAttribute('aria-hidden', 'true')
    expect(skeleton).toHaveAttribute('role', 'presentation')
  })

  it('should render multiple skeletons for loading list', () => {
    render(
      <div>
        <Skeleton data-testid="skeleton-1" className="h-4" />
        <Skeleton data-testid="skeleton-2" className="h-4" />
        <Skeleton data-testid="skeleton-3" className="h-4" />
      </div>
    )

    expect(screen.getByTestId('skeleton-1')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-2')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-3')).toBeInTheDocument()
  })
})
