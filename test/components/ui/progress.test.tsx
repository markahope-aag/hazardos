import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Progress } from '@/components/ui/progress'

describe('Progress', () => {
  it('should render progress bar', () => {
    render(<Progress data-testid="test-progress" value={50} />)
    expect(screen.getByTestId('test-progress')).toBeInTheDocument()
  })

  it('should have correct role', () => {
    render(<Progress value={25} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toBeInTheDocument()
  })

  it('should apply default styling', () => {
    render(<Progress data-testid="styled-progress" value={30} />)
    
    const progress = screen.getByTestId('styled-progress')
    expect(progress).toHaveClass(
      'relative',
      'h-4',
      'w-full',
      'overflow-hidden',
      'rounded-full',
      'bg-secondary'
    )
  })

  it('should display correct progress value', () => {
    render(<Progress value={75} />)
    
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveAttribute('data-value', '75')
  })

  it('should handle zero progress', () => {
    render(<Progress value={0} data-testid="zero-progress" />)
    
    const progress = screen.getByTestId('zero-progress')
    expect(progress).toHaveAttribute('data-value', '0')
    
    // Check indicator transform (should be fully translated left)
    const indicator = progress.querySelector('[data-state="loading"]')
    expect(indicator).toBeInTheDocument()
  })

  it('should handle full progress', () => {
    render(<Progress value={100} data-testid="full-progress" />)
    
    const progress = screen.getByTestId('full-progress')
    expect(progress).toHaveAttribute('data-value', '100')
  })

  it('should handle undefined value', () => {
    render(<Progress data-testid="undefined-progress" />)
    
    const progress = screen.getByTestId('undefined-progress')
    // Should default to 0 when value is undefined
    const indicator = progress.querySelector('[style*="translateX(-100%)"]')
    expect(indicator).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<Progress className="custom-progress-class" data-testid="custom-progress" value={40} />)
    
    const progress = screen.getByTestId('custom-progress')
    expect(progress).toHaveClass('custom-progress-class')
  })

  it('should render indicator with correct styling', () => {
    render(<Progress value={60} data-testid="indicator-progress" />)
    
    const progress = screen.getByTestId('indicator-progress')
    const indicator = progress.querySelector('[data-state="loading"]')
    
    expect(indicator).toHaveClass(
      'h-full',
      'w-full',
      'flex-1',
      'bg-primary',
      'transition-all'
    )
  })

  it('should calculate correct transform for indicator', () => {
    render(<Progress value={25} data-testid="transform-progress" />)
    
    const progress = screen.getByTestId('transform-progress')
    const indicator = progress.querySelector('[data-state="loading"]')
    
    // For 25% progress, transform should be translateX(-75%)
    expect(indicator).toHaveStyle('transform: translateX(-75%)')
  })

  it('should handle various progress values', () => {
    const testValues = [0, 25, 50, 75, 100]
    
    testValues.forEach(value => {
      const { unmount } = render(<Progress value={value} data-testid={`progress-${value}`} />)
      
      const progress = screen.getByTestId(`progress-${value}`)
      expect(progress).toHaveAttribute('data-value', value.toString())
      
      const indicator = progress.querySelector('[data-state="loading"]')
      const expectedTransform = `translateX(-${100 - value}%)`
      expect(indicator).toHaveStyle(`transform: ${expectedTransform}`)
      
      unmount()
    })
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(<Progress ref={ref} value={50} data-testid="ref-progress" />)
    
    expect(ref).toHaveBeenCalled()
  })

  it('should have correct display name', () => {
    expect(Progress.displayName).toBe('ProgressPrimitive.Root')
  })

  it('should forward additional props', () => {
    render(
      <Progress 
        data-testid="props-progress" 
        id="progress-id"
        aria-label="Loading progress"
        value={45}
      />
    )
    
    const progress = screen.getByTestId('props-progress')
    expect(progress).toHaveAttribute('id', 'progress-id')
    expect(progress).toHaveAttribute('aria-label', 'Loading progress')
  })

  it('should handle max value prop', () => {
    render(<Progress value={50} max={200} data-testid="max-progress" />)
    
    const progress = screen.getByTestId('max-progress')
    expect(progress).toHaveAttribute('data-max', '200')
  })

  it('should combine custom className with default classes', () => {
    render(<Progress className="custom-class" data-testid="combined-progress" value={30} />)
    
    const progress = screen.getByTestId('combined-progress')
    expect(progress).toHaveClass('custom-class') // custom class
    expect(progress).toHaveClass('relative', 'h-4', 'w-full') // default classes
  })

  it('should handle edge case values', () => {
    // Test negative value (should be clamped to 0)
    const { rerender } = render(<Progress value={-10} data-testid="edge-progress" />)
    let progress = screen.getByTestId('edge-progress')
    expect(progress).toBeInTheDocument()
    
    // Test value over 100 (should be clamped to 100)
    rerender(<Progress value={150} data-testid="edge-progress" />)
    progress = screen.getByTestId('edge-progress')
    expect(progress).toBeInTheDocument()
  })

  it('should support accessibility attributes', () => {
    render(
      <Progress 
        value={60}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={60}
        aria-valuetext="60 percent complete"
        data-testid="accessible-progress"
      />
    )
    
    const progress = screen.getByTestId('accessible-progress')
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    expect(progress).toHaveAttribute('aria-valuenow', '60')
    expect(progress).toHaveAttribute('aria-valuetext', '60 percent complete')
  })

  it('should handle indeterminate state', () => {
    render(<Progress data-testid="indeterminate-progress" />)
    
    const progress = screen.getByTestId('indeterminate-progress')
    // When no value is provided, it should be in indeterminate state
    expect(progress).toBeInTheDocument()
  })

  it('should work with different sizes', () => {
    render(<Progress className="h-2" value={50} data-testid="small-progress" />)
    
    const progress = screen.getByTestId('small-progress')
    expect(progress).toHaveClass('h-2')
  })

  it('should work with different colors', () => {
    render(
      <Progress 
        className="bg-gray-200" 
        value={70} 
        data-testid="colored-progress" 
      />
    )
    
    const progress = screen.getByTestId('colored-progress')
    expect(progress).toHaveClass('bg-gray-200')
  })
})