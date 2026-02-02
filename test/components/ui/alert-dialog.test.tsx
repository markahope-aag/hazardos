import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

describe('AlertDialog Component', () => {
  it('should render without crashing', () => {
    expect(() =>
      render(
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button>Delete</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
    ).not.toThrow()
  })

  it('should render trigger button', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Title</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.getByRole('button', { name: /open dialog/i })).toBeInTheDocument()
  })

  it('should open dialog when trigger is clicked', async () => {
    const user = userEvent.setup()

    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the item.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(screen.getByText('Confirm Delete')).toBeVisible()
    expect(screen.getByText('This will permanently delete the item.')).toBeVisible()
  })

  it('should have Cancel button', async () => {
    const user = userEvent.setup()

    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Title</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    await user.click(screen.getByRole('button', { name: /open/i }))

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('should close dialog when Cancel is clicked', async () => {
    const user = userEvent.setup()

    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Title</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    await user.click(screen.getByRole('button', { name: /open/i }))
    expect(screen.getByText('Title')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByText('Title')).not.toBeInTheDocument()
  })

  it('should call action onClick when Action is clicked', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()

    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    await user.click(screen.getByRole('button', { name: /open/i }))
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    expect(onAction).toHaveBeenCalled()
  })

  it('should render with controlled open state', () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Controlled Dialog</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.getByText('Controlled Dialog')).toBeVisible()
  })

  it('should not render content when open is false', () => {
    render(
      <AlertDialog open={false}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hidden Dialog</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.queryByText('Hidden Dialog')).not.toBeInTheDocument()
  })
})
