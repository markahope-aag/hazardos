import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import TeamSettingsPage from '@/app/(dashboard)/settings/team/page'

const mockFetch = vi.fn()
global.fetch = mockFetch

let profilesFromCall = 0

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-self' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table !== 'profiles') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        }
      }
      profilesFromCall += 1
      if (profilesFromCall === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { organization_id: 'org-123', role: 'tenant_owner' },
                  error: null,
                }),
            }),
          }),
        }
      }
      const chain: Record<string, unknown> = {}
      const self = () => chain
      chain.select = self
      chain.eq = self
      chain.order = self
      ;(chain as { then: (fn: (v: { data: unknown[]; error: null }) => unknown) => unknown }).then = (onFulfilled) =>
        Promise.resolve({
          data: [
            {
              id: 'user-self',
              first_name: 'Sam',
              last_name: 'Admin',
              email: 'sam@example.com',
              phone: null,
              role: 'tenant_owner',
              last_login_at: null,
            },
          ],
          error: null,
        }).then(onFulfilled)
      return chain
    }),
  }),
}))

describe('TeamSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profilesFromCall = 0
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ invitations: [] }),
    })
  })

  it('renders team heading and member list', async () => {
    render(<TeamSettingsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Team' })).toBeInTheDocument()
    })
    expect(screen.getByText('Sam Admin')).toBeInTheDocument()
    expect(screen.getByText('sam@example.com')).toBeInTheDocument()
  })
})
