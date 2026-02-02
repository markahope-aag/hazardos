import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ApiDocsPage from '@/app/(dashboard)/api-docs/page'

// Mock SwaggerUI since it requires SSR=false
vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<{ default: React.ComponentType }>, options: { loading?: () => JSX.Element }) => {
    // Return the loading component for testing
    return options?.loading || (() => <div data-testid="swagger-ui">SwaggerUI</div>)
  },
}))

// Mock the openapi spec
vi.mock('@/lib/openapi/openapi-spec', () => ({
  openApiSpec: {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {},
  },
}))

describe('ApiDocsPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<ApiDocsPage />)).not.toThrow()
  })

  it('displays API documentation heading', () => {
    render(<ApiDocsPage />)
    expect(screen.getByText('API Documentation')).toBeInTheDocument()
  })

  it('displays description text', () => {
    render(<ApiDocsPage />)
    expect(screen.getByText('Comprehensive API reference for the HazardOS platform')).toBeInTheDocument()
  })

  it('renders loading state for SwaggerUI', () => {
    render(<ApiDocsPage />)
    // The loading component should be rendered initially
    expect(screen.getByText('Loading API Documentation...')).toBeInTheDocument()
  })
})
