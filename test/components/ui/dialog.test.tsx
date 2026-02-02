import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

describe('Dialog Component', () => {
  it('should render dialog trigger', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    expect(trigger).toBeInTheDocument()
  })

  it('should open dialog when trigger is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>This is a test dialog</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Test Dialog')).toBeInTheDocument()
      expect(screen.getByText('This is a test dialog')).toBeInTheDocument()
    })
  })

  it('should close dialog when close button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('should close dialog when escape key is pressed', async () => {
    const user = userEvent.setup()
    
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('should render dialog with header, footer and custom content', async () => {
    const user = userEvent.setup()
    
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmation</DialogTitle>
            <DialogDescription>Are you sure you want to continue?</DialogDescription>
          </DialogHeader>
          <div>Custom content goes here</div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    await user.click(screen.getByRole('button', { name: /open/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Confirmation')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to continue?')).toBeInTheDocument()
      expect(screen.getByText('Custom content goes here')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    })
  })

  it('should handle controlled state', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    
    const ControlledDialog = () => {
      const [open, setOpen] = React.useState(false)
      
      return (
        <Dialog open={open} onOpenChange={(newOpen) => {
          setOpen(newOpen)
          onOpenChange(newOpen)
        }}>
          <DialogTrigger asChild>
            <Button>Open Controlled</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Controlled Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
    }

    render(<ControlledDialog />)

    const trigger = screen.getByRole('button', { name: /open controlled/i })
    await user.click(trigger)

    expect(onOpenChange).toHaveBeenCalledWith(true)
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('should trap focus within dialog', async () => {
    const user = userEvent.setup()

    render(
      <div>
        <Button>Outside Button</Button>
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Focus Test</DialogTitle>
            </DialogHeader>
            <Button>Inside Button</Button>
          </DialogContent>
        </Dialog>
      </div>
    )

    const dialog = screen.getByRole('dialog')
    const insideButton = screen.getByRole('button', { name: /inside button/i })
    const closeButton = screen.getByRole('button', { name: /close/i })

    expect(dialog).toBeInTheDocument()

    // Focus should be trapped within dialog - close button is first
    await user.tab()
    expect(closeButton).toHaveFocus()

    await user.tab()
    expect(insideButton).toHaveFocus()

    // Tabbing again should cycle back to first focusable element
    await user.tab()
    expect(closeButton).toHaveFocus()
  })

  it('should render with custom className', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent className="custom-dialog-class">
          <DialogHeader className="custom-header-class">
            <DialogTitle className="custom-title-class">Custom Styles</DialogTitle>
            <DialogDescription className="custom-description-class">
              Custom description
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="custom-footer-class">
            <Button>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('custom-dialog-class')
    
    const title = screen.getByText('Custom Styles')
    expect(title).toHaveClass('custom-title-class')
    
    const description = screen.getByText('Custom description')
    expect(description).toHaveClass('custom-description-class')
  })
})