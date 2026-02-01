import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Progress } from '@/components/ui/progress'

describe('Progress Component', () => {
  it('should render with default props', () => {
    render(<Progress />)
    
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveClass('relative', 'h-4', 'w-full', 'overflow-hidden', 'rounded-full', 'bg-secondary')
  })

  it('should render with specific value', () => {
    render(<Progress value={50} />)
    
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
    
    // Check if the indicator has the correct transform
    const indicator = progressBar.querySelector('[style*="translateX"]')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveStyle({ transform: 'translateX(-50%)' })
  })

  it('should handle 0% progress', () => {
    render(<Progress value={0} />)
    
    const progressBar = screen.getByRole('progressbar')
    const indicator = progressBar.querySelector('[style*="translateX"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' })
  })

  it('should handle 100% progress', () => {
    render(<Progress value={100} />)
    
    const progressBar = screen.getByRole('progressbar')
    const indicator = progressBar.querySelector('[style*="translateX"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' })
  })

  it('should handle undefined value', () => {
    render(<Progress value={undefined} />)
    
    const progressBar = screen.getByRole('progressbar')
    const indicator = progressBar.querySelector('[style*="translateX"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' })
  })

  it('should apply custom className', () => {
    render(<Progress className="custom-progress" value={25} />)
    
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveClass('custom-progress')
  })

  it('should handle various progress values', () => {
    const testValues = [10, 25, 33, 66, 75, 90]
    
    testValues.forEach(value => {
      const { rerender } = render(<Progress value={value} />)
      
      const progressBar = screen.getByRole('progressbar')
      const indicator = progressBar.querySelector('[style*="translateX"]')
      expect(indicator).toHaveStyle({ transform: `translateX(-${100 - value}%)` })
      
      rerender(<div />)
    })
  })

  it('should handle edge case values', () => {
    // Test negative value
    const { rerender } = render(<Progress value={-10} />)
    let progressBar = screen.getByRole('progressbar')
    let indicator = progressBar.querySelector('[style*="translateX"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-110%)' })

    // Test value over 100
    rerender(<Progress value={150} />)
    progressBar = screen.getByRole('progressbar')
    indicator = progressBar.querySelector('[style*="translateX"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(50%)' })
  })

  it('should forward additional props', () => {
    render(<Progress value={50} data-testid="progress-test" aria-label="Loading progress" />)
    
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('data-testid', 'progress-test')
    expect(progressBar).toHaveAttribute('aria-label', 'Loading progress')
  })

  it('should have proper accessibility attributes', () => {
    render(<Progress value={75} aria-valuemin={0} aria-valuemax={100} aria-valuenow={75} />)
    
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    expect(progressBar).toHaveAttribute('aria-valuenow', '75')
  })

  it('should have correct indicator styling', () => {
    render(<Progress value={60} />)
    
    const progressBar = screen.getByRole('progressbar')
    const indicator = progressBar.querySelector('.h-full.w-full.flex-1.bg-primary.transition-all')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveClass('h-full', 'w-full', 'flex-1', 'bg-primary', 'transition-all')
  })

  it('should be accessible with screen readers', () => {
    render(
      <div>
        <label htmlFor="file-progress">File upload progress</label>
        <Progress id="file-progress" value={45} aria-valuenow={45} aria-valuemin={0} aria-valuemax={100} />
      </div>
    )
    
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('id', 'file-progress')
    expect(screen.getByLabelText('File upload progress')).toBe(progressBar)
  })

  it('should handle decimal values', () => {
    render(<Progress value={33.33} />)
    
    const progressBar = screen.getByRole('progressbar')
    const indicator = progressBar.querySelector('[style*="translateX"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-66.67%)' })
  })

  it('should update when value changes', () => {
    const { rerender } = render(<Progress value={20} />)
    
    let progressBar = screen.getByRole('progressbar')
    let indicator = progressBar.querySelector('[style*="translateX"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-80%)' })

    rerender(<Progress value={80} />)
    
    progressBar = screen.getByRole('progressbar')
    indicator = progressBar.querySelector('[style*="translateX"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-20%)' })
  })
})