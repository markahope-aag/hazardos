import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'

describe('Collapsible Component', () => {
  it('should render without crashing', () => {
    expect(() =>
      render(
        <Collapsible>
          <CollapsibleTrigger>Toggle</CollapsibleTrigger>
          <CollapsibleContent>Content</CollapsibleContent>
        </Collapsible>
      )
    ).not.toThrow()
  })

  it('should render trigger', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle Section</CollapsibleTrigger>
        <CollapsibleContent>Hidden Content</CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByText('Toggle Section')).toBeInTheDocument()
  })

  it('should hide content by default', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Hidden Content</CollapsibleContent>
      </Collapsible>
    )

    // Content is in DOM but not visible
    const content = screen.queryByText('Hidden Content')
    expect(content === null || content.closest('[data-state="closed"]')).toBeTruthy()
  })

  it('should show content when defaultOpen is true', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Visible Content</CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByText('Visible Content')).toBeVisible()
  })

  it('should toggle content when trigger is clicked', async () => {
    const user = userEvent.setup()

    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Toggle Content</CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByText('Toggle')

    // Click to open
    await user.click(trigger)
    expect(screen.getByText('Toggle Content')).toBeVisible()

    // Click to close
    await user.click(trigger)
    // After closing, content may be hidden or removed
    const content = screen.queryByText('Toggle Content')
    expect(content === null || content.closest('[data-state="closed"]')).toBeTruthy()
  })

  it('should render trigger as Button', async () => {
    const user = userEvent.setup()

    render(
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button>Toggle Button</Button>
        </CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByRole('button', { name: /toggle button/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Content')).toBeVisible()
  })

  it('should support controlled mode', async () => {
    const { rerender } = render(
      <Collapsible open={false}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Controlled Content</CollapsibleContent>
      </Collapsible>
    )

    // Initially closed
    const closedContent = screen.queryByText('Controlled Content')
    expect(closedContent === null || closedContent.closest('[data-state="closed"]')).toBeTruthy()

    // Simulate parent state change
    rerender(
      <Collapsible open={true}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Controlled Content</CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByText('Controlled Content')).toBeVisible()
  })

  it('should support disabled state', async () => {
    const user = userEvent.setup()

    render(
      <Collapsible disabled>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByText('Toggle')
    await user.click(trigger)

    // Content should remain hidden when disabled - queryByText returns null when not found
    expect(screen.queryByText('Content')).toBeFalsy()
  })

  it('should render complex content', async () => {
    const user = userEvent.setup()

    render(
      <Collapsible>
        <CollapsibleTrigger>Show Details</CollapsibleTrigger>
        <CollapsibleContent>
          <div>
            <h4>Details</h4>
            <p>Some detailed information</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
    )

    await user.click(screen.getByText('Show Details'))
    expect(screen.getByRole('heading', { name: 'Details' })).toBeVisible()
    expect(screen.getByText('Some detailed information')).toBeVisible()
    expect(screen.getByText('Item 1')).toBeVisible()
    expect(screen.getByText('Item 2')).toBeVisible()
  })
})
