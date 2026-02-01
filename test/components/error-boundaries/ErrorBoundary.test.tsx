import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '@/components/error-boundaries/ErrorBoundary'

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>Normal content</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error during tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should catch errors and display fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('should show Try again button in fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('should reset error state when Try again clicked', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    await userEvent.click(tryAgainButton)

    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Normal content')).toBeInTheDocument()
  })

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    )
  })

  it('should call custom logger when error occurs', () => {
    const logError = vi.fn()
    const logger = { logError }

    render(
      <ErrorBoundary logger={logger}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(logError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
      expect.any(Object)
    )
  })

  it('should include boundary name in logger context', () => {
    const logError = vi.fn()
    const logger = { logError }

    render(
      <ErrorBoundary name="TestBoundary" logger={logger}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(logError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object),
      expect.objectContaining({ boundaryName: 'TestBoundary' })
    )
  })

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error message</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should render custom fallback function with props', () => {
    const customFallback = ({ error, resetError }: any) => (
      <div>
        <div>Error: {error.message}</div>
        <button onClick={resetError}>Reset</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error: Test error message')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('should call onRetry callback when reset', async () => {
    const onRetry = vi.fn()

    render(
      <ErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    await userEvent.click(tryAgainButton)

    expect(onRetry).toHaveBeenCalled()
  })

  it('should show technical details button in development', () => {
    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByRole('button', { name: /technical details/i })).toBeInTheDocument()
  })

  it('should expand technical details when clicked', async () => {
    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const detailsButton = screen.getByRole('button', { name: /technical details/i })
    await userEvent.click(detailsButton)

    expect(screen.getByText(/Error: Test error message/)).toBeInTheDocument()
  })

  it('should include custom context in error logs', () => {
    const logError = vi.fn()
    const logger = { logError }
    const context = { userId: '123', page: 'dashboard' }

    render(
      <ErrorBoundary logger={logger} context={context}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(logError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object),
      expect.objectContaining(context)
    )
  })
})
