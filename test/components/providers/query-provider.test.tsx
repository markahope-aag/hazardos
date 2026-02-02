import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import QueryProvider from '@/components/providers/query-provider'

describe('QueryProvider', () => {
  it('renders children', () => {
    render(
      <QueryProvider>
        <div data-testid="child">Child content</div>
      </QueryProvider>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('provides query client to children', () => {
    render(
      <QueryProvider>
        <div>Content with query client context</div>
      </QueryProvider>
    )

    expect(screen.getByText('Content with query client context')).toBeInTheDocument()
  })

  it('renders multiple children', () => {
    render(
      <QueryProvider>
        <div data-testid="child1">First</div>
        <div data-testid="child2">Second</div>
      </QueryProvider>
    )

    expect(screen.getByTestId('child1')).toBeInTheDocument()
    expect(screen.getByTestId('child2')).toBeInTheDocument()
  })
})
