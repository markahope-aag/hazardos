import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogFooter, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog'

describe('Dialog', () => {
  it('should render dialog with trigger and content', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogHeader>
          <p>Dialog content</p>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText('Open Dialog')).toBeInTheDocument()
  })

  it('should render DialogContent with close button', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <p>Content</p>
        </DialogContent>
      </Dialog>
    )

    // Check for close button (X icon)
    const closeButton = screen.getByRole('button', { name: /close/i })
    expect(closeButton).toBeInTheDocument()
    
    // Check for X icon
    const xIcon = closeButton.querySelector('svg')
    expect(xIcon).toBeInTheDocument()
  })

  it('should render DialogHeader with correct styling', () => {
    render(
      <DialogHeader data-testid="dialog-header">
        <DialogTitle>Header Title</DialogTitle>
        <DialogDescription>Header Description</DialogDescription>
      </DialogHeader>
    )

    const header = screen.getByTestId('dialog-header')
    expect(header).toHaveClass(
      'flex',
      'flex-col',
      'space-y-1.5',
      'text-center',
      'sm:text-left'
    )
  })

  it('should render DialogFooter with correct styling', () => {
    render(
      <DialogFooter data-testid="dialog-footer">
        <button>Cancel</button>
        <button>Confirm</button>
      </DialogFooter>
    )

    const footer = screen.getByTestId('dialog-footer')
    expect(footer).toHaveClass(
      'flex',
      'flex-col-reverse',
      'sm:flex-row',
      'sm:justify-end',
      'sm:space-x-2'
    )
  })

  it('should render DialogTitle with correct styling', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const title = screen.getByText('Test Title')
    expect(title).toHaveClass(
      'text-lg',
      'font-semibold',
      'leading-none',
      'tracking-tight'
    )
  })

  it('should render DialogDescription with correct styling', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogDescription>Test Description</DialogDescription>
        </DialogContent>
      </Dialog>
    )

    const description = screen.getByText('Test Description')
    expect(description).toHaveClass('text-sm', 'text-muted-foreground')
  })

  it('should apply custom className to DialogContent', () => {
    render(
      <Dialog open>
        <DialogContent className="custom-content-class">
          <DialogTitle>Custom Content</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const content = screen.getByText('Custom Content').closest('[role="dialog"]')
    expect(content).toHaveClass('custom-content-class')
  })

  it('should apply custom className to DialogHeader', () => {
    render(
      <DialogHeader className="custom-header-class" data-testid="custom-header">
        <DialogTitle>Custom Header</DialogTitle>
      </DialogHeader>
    )

    const header = screen.getByTestId('custom-header')
    expect(header).toHaveClass('custom-header-class')
  })

  it('should apply custom className to DialogFooter', () => {
    render(
      <DialogFooter className="custom-footer-class" data-testid="custom-footer">
        <button>Footer Button</button>
      </DialogFooter>
    )

    const footer = screen.getByTestId('custom-footer')
    expect(footer).toHaveClass('custom-footer-class')
  })

  it('should apply custom className to DialogTitle', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle className="custom-title-class">Custom Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const title = screen.getByText('Custom Title')
    expect(title).toHaveClass('custom-title-class')
  })

  it('should apply custom className to DialogDescription', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogDescription className="custom-description-class">Custom Description</DialogDescription>
        </DialogContent>
      </Dialog>
    )

    const description = screen.getByText('Custom Description')
    expect(description).toHaveClass('custom-description-class')
  })

  it('should have correct display names', () => {
    expect(DialogHeader.displayName).toBe('DialogHeader')
    expect(DialogFooter.displayName).toBe('DialogFooter')
  })

  it('should render DialogContent with overlay', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Content with Overlay</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    // The overlay should be rendered as part of DialogContent
    const overlay = document.querySelector('[data-state="open"]')
    expect(overlay).toBeInTheDocument()
  })

  it('should render DialogContent with correct positioning classes', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Positioned Content</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const content = screen.getByText('Positioned Content').closest('[role="dialog"]')
    expect(content).toHaveClass(
      'fixed',
      'left-[50%]',
      'top-[50%]',
      'translate-x-[-50%]',
      'translate-y-[-50%]'
    )
  })

  it('should render DialogContent with animation classes', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Animated Content</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const content = screen.getByText('Animated Content').closest('[role="dialog"]')
    expect(content).toHaveClass(
      'duration-200',
      'data-[state=open]:animate-in',
      'data-[state=closed]:animate-out'
    )
  })

  it('should forward additional props to components', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="content-props" id="dialog-content">
          <DialogTitle data-testid="title-props" id="dialog-title">Props Title</DialogTitle>
          <DialogDescription data-testid="description-props" id="dialog-description">Props Description</DialogDescription>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByTestId('content-props')).toHaveAttribute('id', 'dialog-content')
    expect(screen.getByTestId('title-props')).toHaveAttribute('id', 'dialog-title')
    expect(screen.getByTestId('description-props')).toHaveAttribute('id', 'dialog-description')
  })

  it('should render complete dialog structure', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Dialog</DialogTitle>
            <DialogDescription>This is a complete dialog example</DialogDescription>
          </DialogHeader>
          <div>Main content area</div>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
            <button>Confirm</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText('Open')).toBeInTheDocument()
    // Other elements won't be visible unless dialog is open
  })
})