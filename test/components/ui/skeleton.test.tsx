import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton', () => {
  it('should render skeleton element', () => {
    render(<Skeleton data-testid="test-skeleton" />)
    expect(screen.getByTestId('test-skeleton')).toBeInTheDocument()
  })

  it('should render as div element', () => {
    render(<Skeleton data-testid="div-skeleton" />)
    
    const skeleton = screen.getByTestId('div-skeleton')
    expect(skeleton.tagName).toBe('DIV')
  })

  it('should apply default styling', () => {
    render(<Skeleton data-testid="styled-skeleton" />)
    
    const skeleton = screen.getByTestId('styled-skeleton')
    expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-muted')
  })

  it('should apply custom className', () => {
    render(<Skeleton className="custom-skeleton-class" data-testid="custom-skeleton" />)
    
    const skeleton = screen.getByTestId('custom-skeleton')
    expect(skeleton).toHaveClass('custom-skeleton-class')
  })

  it('should combine custom className with default classes', () => {
    render(<Skeleton className="custom-class" data-testid="combined-skeleton" />)
    
    const skeleton = screen.getByTestId('combined-skeleton')
    expect(skeleton).toHaveClass('custom-class') // custom class
    expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-muted') // default classes
  })

  it('should forward additional props', () => {
    render(
      <Skeleton 
        data-testid="props-skeleton" 
        id="skeleton-id"
        role="presentation"
        aria-label="Loading content"
      />
    )
    
    const skeleton = screen.getByTestId('props-skeleton')
    expect(skeleton).toHaveAttribute('id', 'skeleton-id')
    expect(skeleton).toHaveAttribute('role', 'presentation')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading content')
  })

  it('should work with different sizes', () => {
    const { rerender } = render(<Skeleton className="h-4 w-full" data-testid="size-skeleton" />)
    
    let skeleton = screen.getByTestId('size-skeleton')
    expect(skeleton).toHaveClass('h-4', 'w-full')
    
    rerender(<Skeleton className="h-8 w-8 rounded-full" data-testid="size-skeleton" />)
    
    skeleton = screen.getByTestId('size-skeleton')
    expect(skeleton).toHaveClass('h-8', 'w-8', 'rounded-full')
  })

  it('should work as text placeholder', () => {
    render(<Skeleton className="h-4 w-[250px]" data-testid="text-skeleton" />)
    
    const skeleton = screen.getByTestId('text-skeleton')
    expect(skeleton).toHaveClass('h-4', 'w-[250px]')
  })

  it('should work as avatar placeholder', () => {
    render(<Skeleton className="h-12 w-12 rounded-full" data-testid="avatar-skeleton" />)
    
    const skeleton = screen.getByTestId('avatar-skeleton')
    expect(skeleton).toHaveClass('h-12', 'w-12', 'rounded-full')
  })

  it('should work as card placeholder', () => {
    render(<Skeleton className="h-[200px] w-[350px] rounded-xl" data-testid="card-skeleton" />)
    
    const skeleton = screen.getByTestId('card-skeleton')
    expect(skeleton).toHaveClass('h-[200px]', 'w-[350px]', 'rounded-xl')
  })

  it('should support different animation styles', () => {
    render(<Skeleton className="animate-bounce" data-testid="animated-skeleton" />)
    
    const skeleton = screen.getByTestId('animated-skeleton')
    expect(skeleton).toHaveClass('animate-bounce')
  })

  it('should support different background colors', () => {
    render(<Skeleton className="bg-gray-200" data-testid="colored-skeleton" />)
    
    const skeleton = screen.getByTestId('colored-skeleton')
    expect(skeleton).toHaveClass('bg-gray-200')
  })

  it('should work in loading states', () => {
    render(
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" data-testid="line-1" />
        <Skeleton className="h-4 w-[200px]" data-testid="line-2" />
        <Skeleton className="h-4 w-[150px]" data-testid="line-3" />
      </div>
    )
    
    expect(screen.getByTestId('line-1')).toBeInTheDocument()
    expect(screen.getByTestId('line-2')).toBeInTheDocument()
    expect(screen.getByTestId('line-3')).toBeInTheDocument()
  })

  it('should work with flex layouts', () => {
    render(
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" data-testid="flex-avatar" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" data-testid="flex-line-1" />
          <Skeleton className="h-4 w-[200px]" data-testid="flex-line-2" />
        </div>
      </div>
    )
    
    expect(screen.getByTestId('flex-avatar')).toBeInTheDocument()
    expect(screen.getByTestId('flex-line-1')).toBeInTheDocument()
    expect(screen.getByTestId('flex-line-2')).toBeInTheDocument()
  })

  it('should handle click events when needed', () => {
    const handleClick = vi.fn()
    render(<Skeleton onClick={handleClick} data-testid="clickable-skeleton" />)
    
    const skeleton = screen.getByTestId('clickable-skeleton')
    skeleton.click()
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should work with grid layouts', () => {
    render(
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-20 w-full" data-testid="grid-1" />
        <Skeleton className="h-20 w-full" data-testid="grid-2" />
        <Skeleton className="h-20 w-full" data-testid="grid-3" />
      </div>
    )
    
    expect(screen.getByTestId('grid-1')).toBeInTheDocument()
    expect(screen.getByTestId('grid-2')).toBeInTheDocument()
    expect(screen.getByTestId('grid-3')).toBeInTheDocument()
  })

  it('should support accessibility attributes', () => {
    render(
      <Skeleton 
        data-testid="accessible-skeleton"
        role="status"
        aria-label="Loading content"
        aria-live="polite"
      />
    )
    
    const skeleton = screen.getByTestId('accessible-skeleton')
    expect(skeleton).toHaveAttribute('role', 'status')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading content')
    expect(skeleton).toHaveAttribute('aria-live', 'polite')
  })

  it('should work with different border radius', () => {
    const { rerender } = render(<Skeleton className="rounded-none" data-testid="radius-skeleton" />)
    
    let skeleton = screen.getByTestId('radius-skeleton')
    expect(skeleton).toHaveClass('rounded-none')
    
    rerender(<Skeleton className="rounded-full" data-testid="radius-skeleton" />)
    
    skeleton = screen.getByTestId('radius-skeleton')
    expect(skeleton).toHaveClass('rounded-full')
    
    rerender(<Skeleton className="rounded-lg" data-testid="radius-skeleton" />)
    
    skeleton = screen.getByTestId('radius-skeleton')
    expect(skeleton).toHaveClass('rounded-lg')
  })

  it('should work as table row placeholder', () => {
    render(
      <div className="space-y-2">
        <div className="flex space-x-4">
          <Skeleton className="h-4 w-[100px]" data-testid="table-cell-1" />
          <Skeleton className="h-4 w-[150px]" data-testid="table-cell-2" />
          <Skeleton className="h-4 w-[80px]" data-testid="table-cell-3" />
        </div>
      </div>
    )
    
    expect(screen.getByTestId('table-cell-1')).toBeInTheDocument()
    expect(screen.getByTestId('table-cell-2')).toBeInTheDocument()
    expect(screen.getByTestId('table-cell-3')).toBeInTheDocument()
  })

  it('should work with responsive classes', () => {
    render(
      <Skeleton 
        className="h-4 w-full sm:h-6 md:h-8 lg:h-10" 
        data-testid="responsive-skeleton" 
      />
    )
    
    const skeleton = screen.getByTestId('responsive-skeleton')
    expect(skeleton).toHaveClass('h-4', 'w-full', 'sm:h-6', 'md:h-8', 'lg:h-10')
  })
})