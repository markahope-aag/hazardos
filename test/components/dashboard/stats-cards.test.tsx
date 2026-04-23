import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { DEFAULT_FILTERS } from '@/lib/dashboard/filters'

/**
 * Smoke tests for StatsCards. The component is a server component that
 * issues many parallel Supabase queries; the previous version of this file
 * hand-rolled a chainable mock that matched each query shape exactly and
 * broke as soon as the component added a single query. We now use a deep
 * proxy that makes every call chain resolve to a benign default and assert
 * only on the rendered UI, not the query plan.
 */

// A chainable proxy: every method/prop returns the same proxy, and it's
// also thenable so `await` on any partial chain resolves to { data: [] }.
function createChainableProxy(): unknown {
  const handler: ProxyHandler<(...args: unknown[]) => unknown> = {
    get(_target, prop) {
      if (prop === 'then') {
        // Make the proxy thenable so awaited destructuring works.
        return (onFulfilled: (value: unknown) => unknown) =>
          Promise.resolve({ data: [], count: 0, error: null }).then(onFulfilled)
      }
      return proxy
    },
    apply() {
      return proxy
    },
  }
  const proxy = new Proxy(() => undefined, handler) as unknown
  return proxy
}

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}))

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils')
  return {
    ...actual,
    formatCurrency: (amount: number | null) =>
      amount == null ? '$0.00' : `$${amount.toFixed(2)}`,
  }
})

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}))

vi.mock('lucide-react', () => {
  const Stub = () => <span />
  return {
    DollarSign: Stub,
    FileText: Stub,
    Calendar: Stub,
    TrendingUp: Stub,
    ArrowUp: Stub,
    ArrowDown: Stub,
    Minus: Stub,
  }
})

describe('StatsCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: every .from() call returns a thenable proxy that resolves to
    // empty arrays. Specific tests override via mockImplementationOnce.
    mockSupabaseClient.from.mockImplementation(() => createChainableProxy())

    // Profile lookup returns an org id via the same proxy — but we need the
    // destructured `.data` to have `organization_id`, so override that query.
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
            }),
          }),
        }
      }
      return createChainableProxy()
    })
  })

  it('renders all four stat cards with default filters', async () => {
    render(await StatsCards({ filters: DEFAULT_FILTERS }))
    expect(screen.getAllByTestId('card')).toHaveLength(4)
  })

  it('renders expected card titles', async () => {
    render(await StatsCards({ filters: DEFAULT_FILTERS }))
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('Outstanding AR')).toBeInTheDocument()
    expect(screen.getByText('Open Jobs')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
  })

  it('wraps each card in a drill-down link', async () => {
    const { container } = render(await StatsCards({ filters: DEFAULT_FILTERS }))
    const links = container.querySelectorAll('a[href]')
    expect(links.length).toBe(4)
  })

  it('returns null when the user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } })
    const result = await StatsCards({ filters: DEFAULT_FILTERS })
    expect(result).toBeNull()
  })
})
