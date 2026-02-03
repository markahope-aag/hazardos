import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogFooter, 
  AlertDialogTitle, 
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'

describe('AlertDialog', () => {
  it('should render alert dialog with trigger and content', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open Alert</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alert Title</AlertDialogTitle>
            <AlertDialogDescription>Alert Description</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.getByText('Open Alert')).toBeInTheDocument()
  })

  it('should render AlertDialogHeader with correct styling', () => {
    render(
      <AlertDialogHeader data-testid="alert-header">
        <AlertDialogTitle>Header Title</AlertDialogTitle>
        <AlertDialogDescription>Header Description</AlertDialogDescription>
      </AlertDialogHeader>
    )

    const header = screen.getByTestId('alert-header')
    expect(header).toHaveClass(
      'flex',
      'flex-col',
      'space-y-2',
      'text-center',
      'sm:text-left'
    )
  })

  it('should render AlertDialogFooter with correct styling', () => {
    render(
      <AlertDialogFooter data-testid="alert-footer">
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction>Confirm</AlertDialogAction>
      </AlertDialogFooter>
    )

    const footer = screen.getByTestId('alert-footer')
    expect(footer).toHaveClass(
      'flex',
      'flex-col-reverse',
      'sm:flex-row',
      'sm:justify-end',
      'sm:space-x-2'
    )
  })

  it('should render AlertDialogTitle with correct styling', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Test Title</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    )

    const title = screen.getByText('Test Title')
    expect(title).toHaveClass('text-lg', 'font-semibold')
  })

  it('should render AlertDialogDescription with correct styling', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogDescription>Test Description</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>
    )

    const description = screen.getByText('Test Description')
    expect(description).toHaveClass('text-sm', 'text-muted-foreground')
  })

  it('should render AlertDialogAction with button styling', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogAction data-testid="alert-action">Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    )

    const action = screen.getByTestId('alert-action')
    expect(action).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('should render AlertDialogCancel with outline button styling', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogCancel data-testid="alert-cancel">Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    )

    const cancel = screen.getByTestId('alert-cancel')
    expect(cancel).toHaveClass('border', 'border-gray-300', 'bg-white')
    expect(cancel).toHaveClass('mt-2', 'sm:mt-0')
  })

  it('should apply custom className to components', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent className="custom-content-class">
          <AlertDialogHeader className="custom-header-class" data-testid="custom-header">
            <AlertDialogTitle className="custom-title-class">Custom Title</AlertDialogTitle>
            <AlertDialogDescription className="custom-description-class">Custom Description</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="custom-footer-class" data-testid="custom-footer">
            <AlertDialogCancel className="custom-cancel-class">Cancel</AlertDialogCancel>
            <AlertDialogAction className="custom-action-class">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.getByTestId('custom-header')).toHaveClass('custom-header-class')
    expect(screen.getByTestId('custom-footer')).toHaveClass('custom-footer-class')
    expect(screen.getByText('Custom Title')).toHaveClass('custom-title-class')
    expect(screen.getByText('Custom Description')).toHaveClass('custom-description-class')
    expect(screen.getByText('Cancel')).toHaveClass('custom-cancel-class')
    expect(screen.getByText('Confirm')).toHaveClass('custom-action-class')
  })

  it('should have correct display names', () => {
    expect(AlertDialogHeader.displayName).toBe('AlertDialogHeader')
    expect(AlertDialogFooter.displayName).toBe('AlertDialogFooter')
  })

  it('should render AlertDialogContent with correct positioning', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent data-testid="alert-content">
          <AlertDialogTitle>Positioned Content</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    )

    const content = screen.getByTestId('alert-content')
    expect(content).toHaveClass(
      'fixed',
      'left-[50%]',
      'top-[50%]',
      'translate-x-[-50%]',
      'translate-y-[-50%]'
    )
  })

  it('should render AlertDialogContent with animation classes', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent data-testid="animated-content">
          <AlertDialogTitle>Animated Content</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    )

    const content = screen.getByTestId('animated-content')
    expect(content).toHaveClass(
      'duration-200',
      'data-[state=open]:animate-in',
      'data-[state=closed]:animate-out'
    )
  })

  it('should forward additional props to components', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent data-testid="content-props" id="alert-content">
          <AlertDialogTitle data-testid="title-props" id="alert-title">Props Title</AlertDialogTitle>
          <AlertDialogDescription data-testid="description-props" id="alert-description">Props Description</AlertDialogDescription>
          <AlertDialogAction data-testid="action-props" id="alert-action">Action</AlertDialogAction>
          <AlertDialogCancel data-testid="cancel-props" id="alert-cancel">Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.getByTestId('content-props')).toHaveAttribute('id', 'alert-content')
    expect(screen.getByTestId('title-props')).toHaveAttribute('id', 'alert-title')
    expect(screen.getByTestId('description-props')).toHaveAttribute('id', 'alert-description')
    expect(screen.getByTestId('action-props')).toHaveAttribute('id', 'alert-action')
    expect(screen.getByTestId('cancel-props')).toHaveAttribute('id', 'alert-cancel')
  })

  it('should render complete alert dialog structure', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Delete Item</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.getByText('Delete Item')).toBeInTheDocument()
  })

  it('should render AlertDialogOverlay with correct styling', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Content with Overlay</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    )

    // The overlay should be rendered as part of AlertDialogContent
    const overlay = document.querySelector('[data-state="open"]')
    expect(overlay).toBeInTheDocument()
  })
})