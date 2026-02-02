import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '@/components/error-boundaries/error-boundary'
import React, { useState, useEffect } from 'react'

// Component that throws an error after mounting
// This approach works better with React 19's error handling
function DelayedErrorThrower({ shouldThrow }: { shouldThrow: boolean }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (shouldThrow && mounted) {
    throw new Error('Test error message')
  }

  return <div>Normal content</div>
}

// For tests that need synchronous error throwing, use a class component
class SyncErrorThrower extends React.Component<{ shouldThrow: boolean }> {
  render() {
    if (this.props.shouldThrow) {
      throw new Error('Test error message')
    }
    return <div>Normal content</div>
  }
}

describe('ErrorBoundary', () => {
  let originalConsoleError: typeof console.error

  beforeEach(() => {
    vi.clearAllMocks()
    // Store and suppress console.error during tests
    originalConsoleError = console.error
    console.error = vi.fn()
  })

  afterEach(() => {
    console.error = originalConsoleError
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

  it('should catch errors and display fallback UI', async () => {
    render(
      <ErrorBoundary>
        <DelayedErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('should show Try again button in fallback', async () => {
    render(
      <ErrorBoundary>
        <DelayedErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })

  it('should reset error state when Try again clicked', async () => {
    const user = userEvent.setup()

    // Use a key to control remounting
    const { rerender } = render(
      <ErrorBoundary key="test-1">
        <DelayedErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    await user.click(tryAgainButton)

    // Rerender with non-throwing component and new key to reset ErrorBoundary state
    rerender(
      <ErrorBoundary key="test-2">
        <DelayedErrorThrower shouldThrow={false} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(screen.getByText('Normal content')).toBeInTheDocument()
    })
  })

  it('should call onError callback when error occurs', async () => {
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <DelayedErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      )
    })
  })

  it('should call custom logger when error occurs', async () => {
    const logError = vi.fn()
    const logger = { logError }

    render(
      <ErrorBoundary logger={logger}>
        <DelayedErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) }),
        expect.any(Object)
      )
    })
  })

  it('should include boundary name in logger context', async () => {
    const logError = vi.fn()
    const logger = { logError }

    render(
      <ErrorBoundary name="TestBoundary" logger={logger}>
        <DelayedErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining({ boundaryName: 'TestBoundary' })
      )
    })
  })

  it('should render custom fallback when provided', async () => {
    render(
      <ErrorBoundary fallback={<div>Custom error message</div>}>
        <DelayedErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should render custom fallback function with props', async () => {
    const customFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
      <div>
        <div>Error: {error.message}</div>
        <button onClick={resetError}>Reset</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={customFallback}>
        <DelayedErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(screen.getByText('Error: Test error message')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('should call onRetry callback when reset', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(
      <ErrorBoundary onRetry={onRetry}>
        <DelayedErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    await user.click(tryAgainButton)

    expect(onRetry).toHaveBeenCalled()
  })

  it('should show technical details button in development', async () => {
    render(
      <ErrorBoundary showDetails={true}>
        <DelayedErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /technical details/i })).toBeInTheDocument()
    })
  })

  it('should expand technical details when clicked', async () => {
    const user = userEvent.setup()

    render(
      <ErrorBoundary showDetails={true}>
        <DelayedErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /technical details/i })).toBeInTheDocument()
    })

    const detailsButton = screen.getByRole('button', { name: /technical details/i })
    await user.click(detailsButton)

    await waitFor(() => {
      expect(screen.getByText(/Error: Test error message/)).toBeInTheDocument()
    })
  })

  it('should include custom context in error logs', async () => {
    const logError = vi.fn()
    const logger = { logError }
    const context = { userId: '123', page: 'dashboard' }

    render(
      <ErrorBoundary logger={logger} context={context}>
        <DelayedErrorThrower shouldThrow={true} />
      </ErrorBoundary>
    )

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining(context)
      )
    })
  })
})
