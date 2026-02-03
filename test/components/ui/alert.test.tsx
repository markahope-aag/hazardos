import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

describe('Alert', () => {
  it('should render basic alert', () => {
    render(
      <Alert>
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test Description</AlertDescription>
      </Alert>
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('should have role="alert"', () => {
    render(
      <Alert>
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test Description</AlertDescription>
      </Alert>
    )

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
  })

  it('should render with default variant', () => {
    render(
      <Alert>
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test Description</AlertDescription>
      </Alert>
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('bg-background', 'text-foreground')
  })

  it('should render with destructive variant', () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Error Title</AlertTitle>
        <AlertDescription>Error Description</AlertDescription>
      </Alert>
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('border-destructive/50', 'text-destructive')
  })

  it('should apply custom className', () => {
    render(
      <Alert className="custom-alert-class">
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test Description</AlertDescription>
      </Alert>
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('custom-alert-class')
  })

  it('should render AlertTitle as h5 element', () => {
    render(
      <Alert>
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test Description</AlertDescription>
      </Alert>
    )

    const title = screen.getByText('Test Title')
    expect(title.tagName).toBe('H5')
  })

  it('should apply custom className to AlertTitle', () => {
    render(
      <Alert>
        <AlertTitle className="custom-title-class">Test Title</AlertTitle>
        <AlertDescription>Test Description</AlertDescription>
      </Alert>
    )

    const title = screen.getByText('Test Title')
    expect(title).toHaveClass('custom-title-class')
  })

  it('should render AlertDescription as div element', () => {
    render(
      <Alert>
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test Description</AlertDescription>
      </Alert>
    )

    const description = screen.getByText('Test Description')
    expect(description.tagName).toBe('DIV')
  })

  it('should apply custom className to AlertDescription', () => {
    render(
      <Alert>
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription className="custom-description-class">Test Description</AlertDescription>
      </Alert>
    )

    const description = screen.getByText('Test Description')
    expect(description).toHaveClass('custom-description-class')
  })

  it('should have correct display names', () => {
    expect(Alert.displayName).toBe('Alert')
    expect(AlertTitle.displayName).toBe('AlertTitle')
    expect(AlertDescription.displayName).toBe('AlertDescription')
  })

  it('should render with icon spacing classes', () => {
    render(
      <Alert>
        <svg data-testid="alert-icon" />
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test Description</AlertDescription>
      </Alert>
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('[&>svg~*]:pl-7')
    expect(alert).toHaveClass('[&>svg]:absolute')
    expect(alert).toHaveClass('[&>svg]:left-4')
    expect(alert).toHaveClass('[&>svg]:top-4')
  })

  it('should render AlertTitle with default styling', () => {
    render(
      <Alert>
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test Description</AlertDescription>
      </Alert>
    )

    const title = screen.getByText('Test Title')
    expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight')
  })

  it('should render AlertDescription with default styling', () => {
    render(
      <Alert>
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test Description</AlertDescription>
      </Alert>
    )

    const description = screen.getByText('Test Description')
    expect(description).toHaveClass('text-sm', '[&_p]:leading-relaxed')
  })

  it('should forward additional props', () => {
    render(
      <Alert data-testid="custom-alert">
        <AlertTitle data-testid="custom-title">Test Title</AlertTitle>
        <AlertDescription data-testid="custom-description">Test Description</AlertDescription>
      </Alert>
    )

    expect(screen.getByTestId('custom-alert')).toBeInTheDocument()
    expect(screen.getByTestId('custom-title')).toBeInTheDocument()
    expect(screen.getByTestId('custom-description')).toBeInTheDocument()
  })
})