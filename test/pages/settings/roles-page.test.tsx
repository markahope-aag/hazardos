import { describe, it, expect, vi } from 'vitest'
import type React from 'react'
import { render, screen } from '@testing-library/react'
import RolesPage from '@/app/(dashboard)/settings/roles/page'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { role: 'tenant_owner' },
              error: null,
            }),
        }),
      }),
    })),
  }),
}))

async function renderPage() {
  const ui = (await RolesPage()) as React.ReactElement
  return render(ui)
}

describe('RolesPage', () => {
  it('renders matrix heading for admins', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: /roles & permissions/i })).toBeInTheDocument()
    expect(screen.getByText(/capabilities are currently fixed/i)).toBeInTheDocument()
  })
})
