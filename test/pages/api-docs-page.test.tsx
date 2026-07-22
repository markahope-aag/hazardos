import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ApiDocsPage from '@/app/(dashboard)/api-docs/api-docs-client'

// The page used to render swagger-ui-react behind next/dynamic, so these tests
// asserted on the page's own chrome and on the dynamic loading fallback. Both
// are gone: swagger-ui-react was dropped (it was the sole source of the
// vulnerable immutable 3.8.3) and the OpenApiViewer that replaced it renders
// synchronously, titling the page from the spec's own info block rather than a
// hardcoded heading. Assert on the rendered spec instead.
vi.mock('@/lib/openapi/openapi-spec', () => ({
  openApiSpec: {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    tags: [{ name: 'Customers', description: 'Customer records' }],
    paths: {
      '/api/v1/customers': {
        get: {
          tags: ['Customers'],
          summary: 'List customers',
          responses: { '200': { description: 'OK' } },
        },
      },
    },
  },
}))

describe('ApiDocsPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<ApiDocsPage />)).not.toThrow()
  })

  it('titles the page from the spec info block', () => {
    render(<ApiDocsPage />)
    expect(screen.getByRole('heading', { name: 'Test API' })).toBeInTheDocument()
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })

  it('groups operations under their tag', () => {
    render(<ApiDocsPage />)
    expect(screen.getByRole('heading', { name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByText('Customer records')).toBeInTheDocument()
  })

  it('lists each operation with its method and path', () => {
    render(<ApiDocsPage />)
    expect(screen.getByText('get')).toBeInTheDocument()
    expect(screen.getByText('/api/v1/customers')).toBeInTheDocument()
    expect(screen.getByText('List customers')).toBeInTheDocument()
  })

  it('summarises how many endpoints the spec covers', () => {
    render(<ApiDocsPage />)
    expect(screen.getByText('1 endpoints across 1 groups')).toBeInTheDocument()
  })
})
