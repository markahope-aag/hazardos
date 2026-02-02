import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ApiKeyList } from '@/components/settings/api-key-list'
import type { ApiKey, ApiKeyScope } from '@/types/integrations'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    org_id: 'org-1',
    name: 'Production API Key',
    key_prefix: 'hzd_prod_abc12',
    scopes: ['customers:read', 'jobs:read'] as ApiKeyScope[],
    rate_limit: 1000,
    last_used_at: '2024-01-15T10:00:00Z',
    is_active: true,
    created_at: '2024-01-01',
    expires_at: null,
  },
  {
    id: '2',
    org_id: 'org-1',
    name: 'Test API Key',
    key_prefix: 'hzd_test_xyz99',
    scopes: ['customers:read', 'customers:write', 'jobs:read', 'jobs:write'] as ApiKeyScope[],
    rate_limit: 500,
    last_used_at: null,
    is_active: true,
    created_at: '2024-01-01',
    expires_at: null,
  },
]

const mockScopes = [
  { value: 'customers:read' as ApiKeyScope, label: 'Read Customers', description: 'Read customer data' },
  { value: 'customers:write' as ApiKeyScope, label: 'Write Customers', description: 'Write customer data' },
  { value: 'jobs:read' as ApiKeyScope, label: 'Read Jobs', description: 'Read job data' },
  { value: 'jobs:write' as ApiKeyScope, label: 'Write Jobs', description: 'Write job data' },
]

describe('ApiKeyList Component', () => {
  it('should render without crashing', () => {
    expect(() => render(<ApiKeyList apiKeys={mockApiKeys} availableScopes={mockScopes} />)).not.toThrow()
  })

  it('should display API key names', () => {
    render(<ApiKeyList apiKeys={mockApiKeys} availableScopes={mockScopes} />)
    expect(screen.getByText('Production API Key')).toBeInTheDocument()
    expect(screen.getByText('Test API Key')).toBeInTheDocument()
  })

  it('should display key prefixes', () => {
    render(<ApiKeyList apiKeys={mockApiKeys} availableScopes={mockScopes} />)
    expect(screen.getByText('hzd_prod_abc12...')).toBeInTheDocument()
    expect(screen.getByText('hzd_test_xyz99...')).toBeInTheDocument()
  })

  it('should display key count', () => {
    render(<ApiKeyList apiKeys={mockApiKeys} availableScopes={mockScopes} />)
    expect(screen.getByText('2 API keys configured')).toBeInTheDocument()
  })

  it('should display singular when one key', () => {
    render(<ApiKeyList apiKeys={[mockApiKeys[0]]} availableScopes={mockScopes} />)
    expect(screen.getByText('1 API key configured')).toBeInTheDocument()
  })

  it('should display rate limits', () => {
    render(<ApiKeyList apiKeys={mockApiKeys} availableScopes={mockScopes} />)
    expect(screen.getByText('1,000/hr')).toBeInTheDocument()
    expect(screen.getByText('500/hr')).toBeInTheDocument()
  })

  it('should display Never for unused keys', () => {
    render(<ApiKeyList apiKeys={mockApiKeys} availableScopes={mockScopes} />)
    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('should display Active API Keys title', () => {
    render(<ApiKeyList apiKeys={mockApiKeys} availableScopes={mockScopes} />)
    expect(screen.getByText('Active API Keys')).toBeInTheDocument()
  })

  it('should display table headers', () => {
    render(<ApiKeyList apiKeys={mockApiKeys} availableScopes={mockScopes} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Key')).toBeInTheDocument()
    expect(screen.getByText('Scopes')).toBeInTheDocument()
    expect(screen.getByText('Last Used')).toBeInTheDocument()
    expect(screen.getByText('Rate Limit')).toBeInTheDocument()
  })

  it('should display empty state when no API keys', () => {
    render(<ApiKeyList apiKeys={[]} availableScopes={mockScopes} />)
    expect(screen.getByText('No API keys')).toBeInTheDocument()
    expect(screen.getByText(/Create an API key/)).toBeInTheDocument()
  })

  it('should show scope badges', () => {
    render(<ApiKeyList apiKeys={mockApiKeys} availableScopes={mockScopes} />)
    expect(screen.getAllByText('Read Customers').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Read Jobs').length).toBeGreaterThan(0)
  })

  it('should show +N for excess scopes', () => {
    render(<ApiKeyList apiKeys={mockApiKeys} availableScopes={mockScopes} />)
    // The second key has 4 scopes, only 2 are shown, so +2 should appear
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('should render revoke buttons', () => {
    render(<ApiKeyList apiKeys={mockApiKeys} availableScopes={mockScopes} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
