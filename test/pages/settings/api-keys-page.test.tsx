import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-123' } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { organization_id: 'org-123' } }),
        }),
      }),
    }),
  }),
}))

// Mock ApiKeyService
vi.mock('@/lib/services/api-key-service', () => ({
  ApiKeyService: {
    list: () => Promise.resolve([
      {
        id: 'key-1',
        name: 'Production Key',
        prefix: 'hzd_live_abc',
        scopes: ['customers:read', 'jobs:read'],
        created_at: '2024-01-01T00:00:00Z',
        last_used_at: '2024-01-15T00:00:00Z',
        expires_at: null,
      },
      {
        id: 'key-2',
        name: 'Test Key',
        prefix: 'hzd_test_xyz',
        scopes: ['customers:read'],
        created_at: '2024-01-10T00:00:00Z',
        last_used_at: null,
        expires_at: '2024-12-31T00:00:00Z',
      },
    ]),
    getAvailableScopes: () => [
      { value: 'customers:read', label: 'Read Customers' },
      { value: 'customers:write', label: 'Write Customers' },
      { value: 'jobs:read', label: 'Read Jobs' },
      { value: 'jobs:write', label: 'Write Jobs' },
    ],
  },
}))

// Mock ApiKeyList component
vi.mock('@/components/settings/api-key-list', () => ({
  ApiKeyList: ({ apiKeys, availableScopes }: { apiKeys: unknown[]; availableScopes: unknown[] }) => (
    <div data-testid="api-key-list">
      Keys: {Array.isArray(apiKeys) ? apiKeys.length : 0},
      Scopes: {Array.isArray(availableScopes) ? availableScopes.length : 0}
    </div>
  ),
}))

// Import after mocks
import ApiKeysPage from '@/app/(dashboard)/settings/api/page'

describe('ApiKeysPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await ApiKeysPage()
    expect(() => render(page)).not.toThrow()
  })

  it('displays the page title', async () => {
    const page = await ApiKeysPage()
    render(page)

    expect(screen.getByText('API Keys')).toBeInTheDocument()
  })

  it('displays the page description', async () => {
    const page = await ApiKeysPage()
    render(page)

    expect(screen.getByText('Manage API keys for programmatic access to your data')).toBeInTheDocument()
  })

  it('displays create API key button', async () => {
    const page = await ApiKeysPage()
    render(page)

    expect(screen.getByRole('link', { name: /create api key/i })).toBeInTheDocument()
  })

  it('links to new API key page', async () => {
    const page = await ApiKeysPage()
    render(page)

    const link = screen.getByRole('link', { name: /create api key/i })
    expect(link).toHaveAttribute('href', '/settings/api/new')
  })

  it('renders API key list', async () => {
    const page = await ApiKeysPage()
    render(page)

    expect(screen.getByTestId('api-key-list')).toBeInTheDocument()
  })

  it('passes api keys to list component', async () => {
    const page = await ApiKeysPage()
    render(page)

    expect(screen.getByText(/Keys: 2/)).toBeInTheDocument()
  })

  it('passes available scopes to list component', async () => {
    const page = await ApiKeysPage()
    render(page)

    expect(screen.getByText(/Scopes: 4/)).toBeInTheDocument()
  })
})
