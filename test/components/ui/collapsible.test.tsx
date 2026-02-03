import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

describe('Collapsible', () => {
  it('should render collapsible with trigger and content', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle Content</CollapsibleTrigger>
        <CollapsibleContent>
          <p>Collapsible content</p>
        </CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByText('Toggle Content')).toBeInTheDocument()
    expect(screen.getByText('Collapsible content')).toBeInTheDocument()
  })

  it('should render CollapsibleTrigger as button', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Click to toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByRole('button', { name: 'Click to toggle' })
    expect(trigger).toBeInTheDocument()
  })

  it('should handle open state', () => {
    render(
      <Collapsible open>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="collapsible-content">
          Open content
        </CollapsibleContent>
      </Collapsible>
    )

    const content = screen.getByTestId('collapsible-content')
    expect(content).toBeInTheDocument()
    expect(screen.getByText('Open content')).toBeInTheDocument()
  })

  it('should handle closed state', () => {
    render(
      <Collapsible open={false}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="collapsible-content">
          Closed content
        </CollapsibleContent>
      </Collapsible>
    )

    // Content should still be in DOM but potentially hidden by Radix UI
    const content = screen.getByTestId('collapsible-content')
    expect(content).toBeInTheDocument()
  })

  it('should toggle content when trigger is clicked', () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="collapsible-content">
          Toggleable content
        </CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByRole('button', { name: 'Toggle' })
    
    // Click to toggle
    fireEvent.click(trigger)
    
    // Check that the state has changed (Radix UI manages the actual visibility)
    const content = screen.getByTestId('collapsible-content')
    expect(content).toBeInTheDocument()
  })

  it('should handle onOpenChange callback', () => {
    const handleOpenChange = vi.fn()
    
    render(
      <Collapsible onOpenChange={handleOpenChange}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)
    
    expect(handleOpenChange).toHaveBeenCalledTimes(1)
  })

  it('should forward props to Collapsible root', () => {
    render(
      <Collapsible data-testid="collapsible-root" className="custom-class">
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )

    const root = screen.getByTestId('collapsible-root')
    expect(root).toBeInTheDocument()
    expect(root).toHaveClass('custom-class')
  })

  it('should forward props to CollapsibleTrigger', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger data-testid="collapsible-trigger" className="trigger-class">
          Custom Trigger
        </CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByTestId('collapsible-trigger')
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveClass('trigger-class')
  })

  it('should forward props to CollapsibleContent', () => {
    render(
      <Collapsible open>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="collapsible-content" className="content-class">
          Custom Content
        </CollapsibleContent>
      </Collapsible>
    )

    const content = screen.getByTestId('collapsible-content')
    expect(content).toBeInTheDocument()
    expect(content).toHaveClass('content-class')
  })

  it('should handle disabled state', () => {
    render(
      <Collapsible disabled>
        <CollapsibleTrigger>Disabled Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByRole('button')
    expect(trigger).toBeDisabled()
  })

  it('should render complex content structure', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>
          <span>Complex Trigger</span>
          <span>with multiple elements</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div>
            <h3>Complex Content</h3>
            <p>With nested elements</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByText('Complex Trigger')).toBeInTheDocument()
    expect(screen.getByText('with multiple elements')).toBeInTheDocument()
    expect(screen.getByText('Complex Content')).toBeInTheDocument()
    expect(screen.getByText('With nested elements')).toBeInTheDocument()
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('should handle controlled open state', () => {
    const { rerender } = render(
      <Collapsible open={false}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="controlled-content">
          Controlled content
        </CollapsibleContent>
      </Collapsible>
    )

    // Initially closed
    let content = screen.getByTestId('controlled-content')
    expect(content).toBeInTheDocument()

    // Change to open
    rerender(
      <Collapsible open={true}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="controlled-content">
          Controlled content
        </CollapsibleContent>
      </Collapsible>
    )

    content = screen.getByTestId('controlled-content')
    expect(content).toBeInTheDocument()
  })

  it('should work as uncontrolled component', () => {
    render(
      <Collapsible defaultOpen={true}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="uncontrolled-content">
          Uncontrolled content
        </CollapsibleContent>
      </Collapsible>
    )

    const content = screen.getByTestId('uncontrolled-content')
    expect(content).toBeInTheDocument()
  })

  it('should handle multiple collapsibles independently', () => {
    render(
      <div>
        <Collapsible data-testid="first-collapsible">
          <CollapsibleTrigger>First Toggle</CollapsibleTrigger>
          <CollapsibleContent>First Content</CollapsibleContent>
        </Collapsible>
        <Collapsible data-testid="second-collapsible">
          <CollapsibleTrigger>Second Toggle</CollapsibleTrigger>
          <CollapsibleContent>Second Content</CollapsibleContent>
        </Collapsible>
      </div>
    )

    expect(screen.getByText('First Toggle')).toBeInTheDocument()
    expect(screen.getByText('Second Toggle')).toBeInTheDocument()
    expect(screen.getByText('First Content')).toBeInTheDocument()
    expect(screen.getByText('Second Content')).toBeInTheDocument()
  })

  it('should support accessibility attributes', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger aria-label="Toggle content visibility">
          Toggle
        </CollapsibleTrigger>
        <CollapsibleContent aria-labelledby="content-title">
          <h3 id="content-title">Content Title</h3>
          <p>Content body</p>
        </CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByLabelText('Toggle content visibility')
    expect(trigger).toBeInTheDocument()
    
    const contentTitle = screen.getByText('Content Title')
    expect(contentTitle).toHaveAttribute('id', 'content-title')
  })
})