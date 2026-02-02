import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Separator } from '@/components/ui/separator'

describe('Separator Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<Separator />)).not.toThrow()
  })

  it('should render as horizontal by default', () => {
    render(<Separator data-testid="separator" />)
    const separator = screen.getByTestId('separator')
    expect(separator).toHaveClass('h-[1px]')
    expect(separator).toHaveClass('w-full')
  })

  it('should render as vertical when orientation is vertical', () => {
    render(<Separator orientation="vertical" data-testid="separator" />)
    const separator = screen.getByTestId('separator')
    expect(separator).toHaveClass('h-full')
    expect(separator).toHaveClass('w-[1px]')
  })

  it('should have decorative role none by default', () => {
    render(<Separator data-testid="separator" />)
    expect(screen.getByTestId('separator')).toHaveAttribute('role', 'none')
  })

  it('should have separator role when not decorative', () => {
    render(<Separator decorative={false} data-testid="separator" />)
    expect(screen.getByTestId('separator')).toHaveAttribute('role', 'separator')
  })

  it('should have aria-orientation when not decorative', () => {
    render(<Separator decorative={false} orientation="vertical" data-testid="separator" />)
    expect(screen.getByTestId('separator')).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('should not have aria-orientation when decorative', () => {
    render(<Separator decorative={true} orientation="vertical" data-testid="separator" />)
    expect(screen.getByTestId('separator')).not.toHaveAttribute('aria-orientation')
  })

  it('should accept custom className', () => {
    render(<Separator className="my-4" data-testid="separator" />)
    expect(screen.getByTestId('separator')).toHaveClass('my-4')
  })

  it('should have bg-border class', () => {
    render(<Separator data-testid="separator" />)
    expect(screen.getByTestId('separator')).toHaveClass('bg-border')
  })

  it('should have shrink-0 class', () => {
    render(<Separator data-testid="separator" />)
    expect(screen.getByTestId('separator')).toHaveClass('shrink-0')
  })

  it('should forward ref', () => {
    const ref = { current: null } as React.RefObject<HTMLDivElement>
    render(<Separator ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})
