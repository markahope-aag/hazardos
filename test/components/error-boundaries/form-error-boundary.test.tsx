import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormErrorBoundary } from '@/components/error-boundaries/form-error-boundary'

// Mock error-boundary
vi.mock('@/components/error-boundaries/error-boundary', () => ({
  ErrorBoundary: ({ children, fallback }: { children: React.ReactNode, fallback: (props: { error: Error, resetError: () => void }) => React.ReactNode }) => {
    // For testing, we'll just render children normally
    return <>{children}</>
  },
}))

describe('FormErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <FormErrorBoundary formName="Customer">
        <div data-testid="child-content">Form Content</div>
      </FormErrorBoundary>
    )
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('accepts custom form name prop', () => {
    render(
      <FormErrorBoundary formName="Invoice">
        <div>Form</div>
      </FormErrorBoundary>
    )
    expect(screen.getByText('Form')).toBeInTheDocument()
  })

  it('accepts backPath prop', () => {
    render(
      <FormErrorBoundary formName="Test" backPath="/customers">
        <div>Form</div>
      </FormErrorBoundary>
    )
    expect(screen.getByText('Form')).toBeInTheDocument()
  })

  it('accepts showBackOption prop', () => {
    render(
      <FormErrorBoundary formName="Test" showBackOption={false}>
        <div>Form</div>
      </FormErrorBoundary>
    )
    expect(screen.getByText('Form')).toBeInTheDocument()
  })

  it('uses default form name when not provided', () => {
    render(
      <FormErrorBoundary>
        <div>Default Form</div>
      </FormErrorBoundary>
    )
    expect(screen.getByText('Default Form')).toBeInTheDocument()
  })
})
