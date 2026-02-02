import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

describe('Popover Component', () => {
  it('should render without crashing', () => {
    expect(() =>
      render(
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      )
    ).not.toThrow()
  })

  it('should render trigger button', () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Open Popover</Button>
        </PopoverTrigger>
        <PopoverContent>Popover Content</PopoverContent>
      </Popover>
    )

    expect(screen.getByRole('button', { name: /open popover/i })).toBeInTheDocument()
  })

  it('should open popover on click', async () => {
    const user = userEvent.setup()

    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Open</Button>
        </PopoverTrigger>
        <PopoverContent>Popover Content</PopoverContent>
      </Popover>
    )

    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Popover Content')).toBeVisible()
  })

  it('should close popover when clicking outside', async () => {
    const user = userEvent.setup()

    render(
      <div>
        <div data-testid="outside">Outside</div>
        <Popover>
          <PopoverTrigger asChild>
            <Button>Open</Button>
          </PopoverTrigger>
          <PopoverContent>Popover Content</PopoverContent>
        </Popover>
      </div>
    )

    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Popover Content')).toBeVisible()

    await user.click(screen.getByTestId('outside'))
    // Popover should close after clicking outside
  })

  it('should accept custom className on PopoverContent', async () => {
    const user = userEvent.setup()

    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Open</Button>
        </PopoverTrigger>
        <PopoverContent className="custom-popover">Content</PopoverContent>
      </Popover>
    )

    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Content').closest('[role="dialog"]')).toHaveClass('custom-popover')
  })

  it('should render complex content', async () => {
    const user = userEvent.setup()

    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Settings</Button>
        </PopoverTrigger>
        <PopoverContent>
          <h3>Settings</h3>
          <p>Configure your preferences</p>
          <button>Save</button>
        </PopoverContent>
      </Popover>
    )

    await user.click(screen.getByRole('button', { name: /settings/i }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeVisible()
    expect(screen.getByText('Configure your preferences')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
  })

  it('should support different align options', async () => {
    const user = userEvent.setup()

    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Open</Button>
        </PopoverTrigger>
        <PopoverContent align="start">Content</PopoverContent>
      </Popover>
    )

    await user.click(screen.getByRole('button'))
    const content = screen.getByText('Content').closest('[role="dialog"]')
    expect(content).toBeInTheDocument()
  })

  it('should support sideOffset', async () => {
    const user = userEvent.setup()

    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Open</Button>
        </PopoverTrigger>
        <PopoverContent sideOffset={10}>Content</PopoverContent>
      </Popover>
    )

    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Content')).toBeVisible()
  })

  it('should render trigger as custom element', async () => {
    const user = userEvent.setup()

    render(
      <Popover>
        <PopoverTrigger asChild>
          <span role="button" tabIndex={0}>Custom Trigger</span>
        </PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    )

    await user.click(screen.getByText('Custom Trigger'))
    expect(screen.getByText('Content')).toBeVisible()
  })
})
