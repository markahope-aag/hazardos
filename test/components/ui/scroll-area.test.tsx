import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

describe('ScrollArea Component', () => {
  it('should render without crashing', () => {
    expect(() =>
      render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      )
    ).not.toThrow()
  })

  it('should render children', () => {
    render(
      <ScrollArea>
        <div>Scrollable Content</div>
      </ScrollArea>
    )

    expect(screen.getByText('Scrollable Content')).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    render(
      <ScrollArea className="h-[200px] w-[300px]" data-testid="scroll-area">
        <div>Content</div>
      </ScrollArea>
    )

    const scrollArea = screen.getByTestId('scroll-area')
    expect(scrollArea).toHaveClass('h-[200px]')
    expect(scrollArea).toHaveClass('w-[300px]')
  })

  it('should have overflow-hidden class', () => {
    render(
      <ScrollArea data-testid="scroll-area">
        <div>Content</div>
      </ScrollArea>
    )

    expect(screen.getByTestId('scroll-area')).toHaveClass('overflow-hidden')
  })

  it('should have relative positioning', () => {
    render(
      <ScrollArea data-testid="scroll-area">
        <div>Content</div>
      </ScrollArea>
    )

    expect(screen.getByTestId('scroll-area')).toHaveClass('relative')
  })

  it('should render multiple children', () => {
    render(
      <ScrollArea>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </ScrollArea>
    )

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  it('should render a list of items', () => {
    const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`)

    render(
      <ScrollArea className="h-[200px]">
        <div className="p-4">
          {items.map((item) => (
            <div key={item} className="py-2">
              {item}
            </div>
          ))}
        </div>
      </ScrollArea>
    )

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 10')).toBeInTheDocument()
  })

  it('should forward ref', () => {
    const ref = { current: null } as React.RefObject<HTMLDivElement>
    render(
      <ScrollArea ref={ref}>
        <div>Content</div>
      </ScrollArea>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})

describe('ScrollBar Component', () => {
  it('should render without crashing when used inside ScrollArea', () => {
    expect(() =>
      render(
        <ScrollArea>
          <div>Content</div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      )
    ).not.toThrow()
  })

  it('should render ScrollArea with ScrollBar', () => {
    const { container } = render(
      <ScrollArea data-testid="scroll-area">
        <div>Content with scroll</div>
      </ScrollArea>
    )

    // ScrollArea includes a ScrollBar by default
    expect(container).toBeInTheDocument()
    expect(screen.getByText('Content with scroll')).toBeInTheDocument()
  })
})
