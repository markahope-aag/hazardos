import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataErrorBoundary } from '@/components/error-boundaries/data-error-boundary'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DataErrorBoundary Component', () => {
  it('should render children when no error', () => {
    render(
      <DataErrorBoundary>
        <div>Test Data</div>
      </DataErrorBoundary>
    )

    expect(screen.getByText('Test Data')).toBeInTheDocument()
  })

  it('should render without crashing', () => {
    expect(() =>
      render(
        <DataErrorBoundary>
          <div>Valid data component</div>
        </DataErrorBoundary>
      )
    ).not.toThrow()
  })

  it('should accept dataLabel prop', () => {
    render(
      <DataErrorBoundary dataLabel="customers">
        <div>Customer Data</div>
      </DataErrorBoundary>
    )

    expect(screen.getByText('Customer Data')).toBeInTheDocument()
  })

  it('should accept showCard prop', () => {
    expect(() =>
      render(
        <DataErrorBoundary showCard={false}>
          <div>Data Without Card</div>
        </DataErrorBoundary>
      )
    ).not.toThrow()
  })

  it('should accept minHeight prop', () => {
    expect(() =>
      render(
        <DataErrorBoundary minHeight="300px">
          <div>Data with Min Height</div>
        </DataErrorBoundary>
      )
    ).not.toThrow()
  })

  it('should accept emptyMessage prop', () => {
    expect(() =>
      render(
        <DataErrorBoundary emptyMessage="Custom error message">
          <div>Data Content</div>
        </DataErrorBoundary>
      )
    ).not.toThrow()
  })

  it('should render nested data components', () => {
    render(
      <DataErrorBoundary dataLabel="orders">
        <div className="data-container">
          <div className="data-header">Orders Header</div>
          <div className="data-body">Orders List</div>
        </div>
      </DataErrorBoundary>
    )

    expect(screen.getByText('Orders Header')).toBeInTheDocument()
    expect(screen.getByText('Orders List')).toBeInTheDocument()
  })

  it('should accept onError callback prop', () => {
    const onError = vi.fn()

    render(
      <DataErrorBoundary onError={onError}>
        <div>Valid Data</div>
      </DataErrorBoundary>
    )

    // onError is not called when there's no error
    expect(onError).not.toHaveBeenCalled()
  })

  it('should accept onRetry callback prop', () => {
    const onRetry = vi.fn()

    render(
      <DataErrorBoundary onRetry={onRetry}>
        <div>Data with Retry</div>
      </DataErrorBoundary>
    )

    expect(screen.getByText('Data with Retry')).toBeInTheDocument()
  })
})
