import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChartErrorBoundary } from '@/components/error-boundaries/chart-error-boundary'

// Suppress console.error for these tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ChartErrorBoundary Component', () => {
  it('should render children when no error', () => {
    render(
      <ChartErrorBoundary>
        <div>Test Chart</div>
      </ChartErrorBoundary>
    )

    expect(screen.getByText('Test Chart')).toBeInTheDocument()
  })

  it('should render without crashing', () => {
    expect(() =>
      render(
        <ChartErrorBoundary>
          <div>Valid chart component</div>
        </ChartErrorBoundary>
      )
    ).not.toThrow()
  })

  it('should render with title prop', () => {
    render(
      <ChartErrorBoundary title="Revenue Trends">
        <div>Chart Content</div>
      </ChartErrorBoundary>
    )

    expect(screen.getByText('Chart Content')).toBeInTheDocument()
  })

  it('should accept compact prop', () => {
    expect(() =>
      render(
        <ChartErrorBoundary compact>
          <div>Compact Chart</div>
        </ChartErrorBoundary>
      )
    ).not.toThrow()
  })

  it('should accept height prop', () => {
    expect(() =>
      render(
        <ChartErrorBoundary height="500px">
          <div>Custom Height Chart</div>
        </ChartErrorBoundary>
      )
    ).not.toThrow()
  })

  it('should accept showCard prop', () => {
    expect(() =>
      render(
        <ChartErrorBoundary showCard={false}>
          <div>No Card Chart</div>
        </ChartErrorBoundary>
      )
    ).not.toThrow()
  })

  it('should render nested chart components', () => {
    render(
      <ChartErrorBoundary title="Dashboard Chart">
        <div className="chart-container">
          <div className="chart-header">Chart Header</div>
          <div className="chart-body">Chart Body</div>
        </div>
      </ChartErrorBoundary>
    )

    expect(screen.getByText('Chart Header')).toBeInTheDocument()
    expect(screen.getByText('Chart Body')).toBeInTheDocument()
  })

  it('should accept onError callback prop', () => {
    const onError = vi.fn()

    render(
      <ChartErrorBoundary onError={onError}>
        <div>Valid Chart</div>
      </ChartErrorBoundary>
    )

    // onError is not called when there's no error
    expect(onError).not.toHaveBeenCalled()
  })
})
